import { Router } from "express";
import { query, logActivity } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { normalizePhone, formatPhoneForDisplay } from "../utils/phone.js";
import { uploadSingleImage, saveCompressedImage } from "../middleware/upload.js";

const router = Router();
router.use(requireAuth);

async function nextSequentialNumber() {
  const result = await query("SELECT nextval('customer_seq') AS n");
  return String(result.rows[0].n).padStart(6, "0");
}

router.get("/", async (req, res) => {
  const q = (req.query.q || "").trim();

  if (!q) {
    const result = await query(
      `SELECT c.*, l.region_id, r.name AS region_name
       FROM customers c
       LEFT JOIN customer_locations l ON l.customer_id = c.id
       LEFT JOIN regions r ON r.id = l.region_id
       WHERE c.status = 'active'
       ORDER BY c.created_at DESC
       LIMIT 50`
    );
    return res.json(result.rows);
  }

  const normalizedQuery = normalizePhone(q);
  const result = await query(
    `SELECT c.*, l.region_id, r.name AS region_name
     FROM customers c
     LEFT JOIN customer_locations l ON l.customer_id = c.id
     LEFT JOIN regions r ON r.id = l.region_id
     WHERE c.status = 'active'
       AND (
         c.phone_normalized = $1
         OR c.name ILIKE '%' || $2 || '%'
         OR c.sequential_number = $2
       )
     ORDER BY c.created_at DESC
     LIMIT 30`,
    [normalizedQuery, q]
  );
  res.json(result.rows);
});

router.get("/:id", async (req, res) => {
  const result = await query(
    `SELECT c.*, l.*
     FROM customers c
     LEFT JOIN customer_locations l ON l.customer_id = c.id
     WHERE c.id = $1`,
    [req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: "العميل غير موجود." });
  res.json(result.rows[0]);
});

router.post("/", async (req, res) => {
  const { name, phone, phone_alt, notes, region_id, street, building_number,
          building_name, floor, apartment, side, access_notes, latitude, longitude, maps_url } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: "الاسم ورقم الهاتف مطلوبان." });
  }

  const normalized = normalizePhone(phone);
  const existing = await query("SELECT * FROM customers WHERE phone_normalized = $1", [normalized]);

  if (existing.rows[0]) {
    return res.status(200).json({
      alreadyExists: true,
      message: "رقم الهاتف موجود مسبقًا — تم عرض العميل الحالي بدل إنشاء عميل جديد.",
      customer: existing.rows[0],
    });
  }

  const seqNumber = await nextSequentialNumber();

  const inserted = await query(
    `INSERT INTO customers (sequential_number, name, phone_normalized, phone_display, phone_alt, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [seqNumber, name.trim(), normalized, formatPhoneForDisplay(normalized), phone_alt || null, notes || null, req.user.id]
  );
  const customer = inserted.rows[0];

  await query(
    `INSERT INTO customer_locations
      (customer_id, latitude, longitude, maps_url, region_id, street, building_number, building_name, floor, apartment, side, access_notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [customer.id, latitude || null, longitude || null, maps_url || null, region_id || null,
     street || null, building_number || null, building_name || null, floor || null,
     apartment || null, side || null, access_notes || null]
  );

  await logActivity({
    userId: req.user.id,
    action: "CREATE_CUSTOMER",
    recordType: "customer",
    recordId: customer.id,
    newValue: { name: customer.name, phone: customer.phone_display },
  });

  res.status(201).json({ alreadyExists: false, customer });
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const before = await query("SELECT * FROM customers WHERE id = $1", [id]);
  if (!before.rows[0]) return res.status(404).json({ error: "العميل غير موجود." });

  const { name, notes, region_id, street, building_number, building_name,
          floor, apartment, side, access_notes, latitude, longitude, maps_url } = req.body;

  const updated = await query(
    `UPDATE customers SET name = COALESCE($1, name), notes = COALESCE($2, notes), updated_at = now()
     WHERE id = $3 RETURNING *`,
    [name, notes, id]
  );

  await query(
    `UPDATE customer_locations SET
      region_id = COALESCE($1, region_id),
      street = COALESCE($2, street),
      building_number = COALESCE($3, building_number),
      building_name = COALESCE($4, building_name),
      floor = COALESCE($5, floor),
      apartment = COALESCE($6, apartment),
      side = COALESCE($7, side),
      access_notes = COALESCE($8, access_notes),
      latitude = COALESCE($9, latitude),
      longitude = COALESCE($10, longitude),
      maps_url = COALESCE($11, maps_url),
      updated_at = now()
     WHERE customer_id = $12`,
    [region_id, street, building_number, building_name, floor, apartment, side,
     access_notes, latitude, longitude, maps_url, id]
  );

  await logActivity({
    userId: req.user.id,
    action: "UPDATE_CUSTOMER",
    recordType: "customer",
    recordId: id,
    oldValue: before.rows[0],
    newValue: updated.rows[0],
  });

  res.json(updated.rows[0]);
});

router.delete("/:id", async (req, res) => {
  if (!req.user.can_delete_customer && req.user.role !== "admin") {
    return res.status(403).json({ error: "ليست لديك صلاحية أرشفة العملاء." });
  }
  const result = await query(
    "UPDATE customers SET status = 'archived', updated_at = now() WHERE id = $1 RETURNING *",
    [req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: "العميل غير موجود." });

  await logActivity({
    userId: req.user.id,
    action: "ARCHIVE_CUSTOMER",
    recordType: "customer",
    recordId: req.params.id,
  });

  res.json({ message: "تمت أرشفة العميل." });
});

router.post("/:id/photo", uploadSingleImage, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "لم يتم إرفاق صورة." });

  const filename = await saveCompressedImage(req.file.buffer, `customer-${req.params.id}`);
  const photoUrl = `/uploads/${filename}`;

  await query(
    "UPDATE customer_locations SET building_photo_url = $1, updated_at = now() WHERE customer_id = $2",
    [photoUrl, req.params.id]
  );

  await logActivity({
    userId: req.user.id,
    action: "UPLOAD_CUSTOMER_PHOTO",
    recordType: "customer",
    recordId: req.params.id,
  });

  res.json({ photoUrl });
});

export default router;

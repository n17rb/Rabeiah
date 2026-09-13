import { Router } from "express";
import { query, logActivity } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { normalizePhone, formatPhoneForDisplay } from "../utils/phone.js";
import { uploadSingleImage, saveCompressedImage } from "../middleware/upload.js";

const router = Router();
router.use(requireAuth);

function canManageCustomers(user) {
  return ["super_admin", "admin", "data_entry"].includes(user.role);
}

function requireCanManageCustomers(req, res, next) {
  if (!canManageCustomers(req.user)) {
    return res.status(403).json({ error: "ليست لديك صلاحية إضافة أو تعديل بيانات العملاء." });
  }
  next();
}

async function nextAutoSequentialNumber() {
  const result = await query("SELECT nextval('customer_seq') AS n");
  return String(result.rows[0].n).padStart(6, "0");
}

router.get("/", async (req, res) => {
  const q = (req.query.q || "").trim();

  if (!q) {
    const result = await query(
      `SELECT c.*, l.region_id, l.maps_url, r.name AS region_name
       FROM customers c
       LEFT JOIN customer_locations l ON l.customer_id = c.id
       LEFT JOIN regions r ON r.id = l.region_id
       WHERE c.status = 'active'
       ORDER BY c.created_at DESC
       LIMIT 50`
    );
    return res.json(result.rows);
  }

  const result = await query(
    `SELECT c.*, l.region_id, l.maps_url, r.name AS region_name
     FROM customers c
     LEFT JOIN customer_locations l ON l.customer_id = c.id
     LEFT JOIN regions r ON r.id = l.region_id
     WHERE c.status = 'active'
       AND (
         c.phone_display LIKE $1 || '%'
         OR c.sequential_number = $1
         OR c.name ILIKE '%' || $1 || '%'
       )
     ORDER BY c.created_at DESC
     LIMIT 30`,
    [q]
  );
  res.json(result.rows);
});

router.get("/:id", async (req, res) => {
  const result = await query(
    `SELECT c.*,
            l.latitude, l.longitude, l.maps_url, l.region_id,
            l.street, l.building_number, l.building_name, l.floor,
            l.apartment, l.side, l.access_notes, l.building_photo_url
     FROM customers c
     LEFT JOIN customer_locations l ON l.customer_id = c.id
     WHERE c.id = $1`,
    [req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: "العميل غير موجود." });
  res.json(result.rows[0]);
});

router.post("/", requireCanManageCustomers, async (req, res) => {
  const { name, phone, phone_alt, notes, sequential_number } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: "الاسم ورقم الهاتف مطلوبان." });
  }

  const normalized = normalizePhone(phone);
  const existingPhone = await query("SELECT * FROM customers WHERE phone_normalized = $1", [normalized]);
  if (existingPhone.rows[0]) {
    return res.status(200).json({
      alreadyExists: true,
      message: "رقم الهاتف موجود مسبقًا — تم عرض العميل الحالي بدل إنشاء عميل جديد.",
      customer: existingPhone.rows[0],
    });
  }

  let seqNumber = (sequential_number || "").trim();
  if (seqNumber) {
    const existingSeq = await query("SELECT id FROM customers WHERE sequential_number = $1", [seqNumber]);
    if (existingSeq.rows[0]) {
      return res.status(400).json({ error: `الرقم التسلسلي "${seqNumber}" مستخدم لعميل آخر مسبقًا.` });
    }
  } else {
    seqNumber = await nextAutoSequentialNumber();
  }

  const inserted = await query(
    `INSERT INTO customers (sequential_number, name, phone_normalized, phone_display, phone_alt, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [seqNumber, name.trim(), normalized, formatPhoneForDisplay(normalized), phone_alt || null, notes || null, req.user.id]
  );
  const customer = inserted.rows[0];

  await query(`INSERT INTO customer_locations (customer_id) VALUES ($1)`, [customer.id]);

  await logActivity({
    userId: req.user.id,
    action: "CREATE_CUSTOMER",
    recordType: "customer",
    recordId: customer.id,
    newValue: { name: customer.name, phone: customer.phone_display, sequential_number: seqNumber },
  });

  res.status(201).json({ alreadyExists: false, customer });
});

router.put("/:id", requireCanManageCustomers, async (req, res) => {
  const { id } = req.params;
  const before = await query("SELECT * FROM customers WHERE id = $1", [id]);
  if (!before.rows[0]) return res.status(404).json({ error: "العميل غير موجود." });

  const {
    name, phone, sequential_number, notes,
    region_id, street, building_number, building_name,
    floor, apartment, side, access_notes,
    latitude, longitude, maps_url,
  } = req.body;

  let phoneNormalized = before.rows[0].phone_normalized;
  let phoneDisplay = before.rows[0].phone_display;

  if (phone) {
    const newNormalized = normalizePhone(phone);
    if (newNormalized !== before.rows[0].phone_normalized) {
      const dup = await query(
        "SELECT id FROM customers WHERE phone_normalized = $1 AND id != $2",
        [newNormalized, id]
      );
      if (dup.rows[0]) {
        return res.status(400).json({ error: "رقم الهاتف هذا مستخدم لعميل آخر مسبقًا." });
      }
      phoneNormalized = newNormalized;
      phoneDisplay = formatPhoneForDisplay(newNormalized);
    }
  }

  if (sequential_number && sequential_number.trim() !== before.rows[0].sequential_number) {
    const dupSeq = await query(
      "SELECT id FROM customers WHERE sequential_number = $1 AND id != $2",
      [sequential_number.trim(), id]
    );
    if (dupSeq.rows[0]) {
      return res.status(400).json({ error: `الرقم التسلسلي "${sequential_number}" مستخدم لعميل آخر مسبقًا.` });
    }
  }

  const updated = await query(
    `UPDATE customers SET
       name = COALESCE($1, name),
       phone_normalized = $2,
       phone_display = $3,
       sequential_number = COALESCE(NULLIF($4, ''), sequential_number),
       notes = COALESCE($5, notes),
       updated_at = now()
     WHERE id = $6 RETURNING *`,
    [name, phoneNormalized, phoneDisplay, sequential_number, notes, id]
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

router.delete("/:id", requireCanManageCustomers, async (req, res) => {
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

  res.json({ message: "تم حذف العميل." });
});

router.post("/:id/photo", requireCanManageCustomers, uploadSingleImage, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "لم يتم إرفاق صورة." });

  const photoUrl = await saveCompressedImage(req.file.buffer, `customer-${req.params.id}`);

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

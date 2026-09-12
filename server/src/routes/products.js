import { Router } from "express";
import { query, logActivity } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const includeArchived = req.query.all === "true" && req.user.role === "admin";
  const result = await query(
    `SELECT * FROM products
     WHERE ($1 = true OR status != 'archived')
     ORDER BY sort_order ASC, id ASC`,
    [includeArchived]
  );
  res.json(result.rows);
});

router.post("/", requireRole("admin"), async (req, res) => {
  const { name, type, unit_price, sort_order } = req.body;
  if (!name || unit_price == null) {
    return res.status(400).json({ error: "اسم المنتج والسعر مطلوبان." });
  }

  const result = await query(
    `INSERT INTO products (name, type, unit_price, sort_order, updated_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name.trim(), type || "standard", unit_price, sort_order || 0, req.user.id]
  );

  await logActivity({
    userId: req.user.id,
    action: "CREATE_PRODUCT",
    recordType: "product",
    recordId: result.rows[0].id,
    newValue: result.rows[0],
  });

  res.status(201).json(result.rows[0]);
});

router.put("/:id", async (req, res) => {
  if (req.user.role !== "admin" && !req.user.can_edit_product_price) {
    return res.status(403).json({ error: "ليست لديك صلاحية تعديل المنتجات أو الأسعار." });
  }

  const before = await query("SELECT * FROM products WHERE id = $1", [req.params.id]);
  if (!before.rows[0]) return res.status(404).json({ error: "المنتج غير موجود." });

  const { name, unit_price, status, sort_order } = req.body;
  const updated = await query(
    `UPDATE products SET
       name = COALESCE($1, name),
       unit_price = COALESCE($2, unit_price),
       status = COALESCE($3, status),
       sort_order = COALESCE($4, sort_order),
       updated_by = $5,
       updated_at = now()
     WHERE id = $6 RETURNING *`,
    [name, unit_price, status, sort_order, req.user.id, req.params.id]
  );

  await logActivity({
    userId: req.user.id,
    action: "UPDATE_PRODUCT",
    recordType: "product",
    recordId: req.params.id,
    oldValue: before.rows[0],
    newValue: updated.rows[0],
  });

  res.json(updated.rows[0]);
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  const result = await query(
    "UPDATE products SET status = 'archived', updated_at = now() WHERE id = $1 RETURNING *",
    [req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: "المنتج غير موجود." });

  await logActivity({
    userId: req.user.id,
    action: "ARCHIVE_PRODUCT",
    recordType: "product",
    recordId: req.params.id,
  });

  res.json({ message: "تمت أرشفة المنتج." });
});

export default router;

import { Router } from "express";
import bcrypt from "bcryptjs";
import { query, logActivity } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireRole("admin"));

router.get("/", async (req, res) => {
  const result = await query(
    `SELECT id, username, full_name, role, status, can_discount, can_delete_customer, can_edit_product_price, created_at
     FROM users ORDER BY created_at ASC`
  );
  res.json(result.rows);
});

router.post("/", async (req, res) => {
  const { username, password, full_name, role, can_discount, can_delete_customer, can_edit_product_price } = req.body;

  if (!username || !password || !full_name || !role) {
    return res.status(400).json({ error: "الرجاء تعبئة كل الحقول المطلوبة." });
  }
  if (!["admin", "driver"].includes(role)) {
    return res.status(400).json({ error: "الدور يجب أن يكون admin أو driver." });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const result = await query(
    `INSERT INTO users (username, password_hash, full_name, role, can_discount, can_delete_customer, can_edit_product_price)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id, username, full_name, role, status`,
    [username.trim(), password_hash, full_name.trim(), role,
     !!can_discount, !!can_delete_customer, !!can_edit_product_price]
  );

  await logActivity({ userId: req.user.id, action: "CREATE_USER", recordType: "user", recordId: result.rows[0].id, newValue: result.rows[0] });
  res.status(201).json(result.rows[0]);
});

router.put("/:id", async (req, res) => {
  const { full_name, status, can_discount, can_delete_customer, can_edit_product_price, password } = req.body;

  let password_hash = null;
  if (password) {
    password_hash = await bcrypt.hash(password, 10);
  }

  const result = await query(
    `UPDATE users SET
       full_name = COALESCE($1, full_name),
       status = COALESCE($2, status),
       can_discount = COALESCE($3, can_discount),
       can_delete_customer = COALESCE($4, can_delete_customer),
       can_edit_product_price = COALESCE($5, can_edit_product_price),
       password_hash = COALESCE($6, password_hash)
     WHERE id = $7
     RETURNING id, username, full_name, role, status, can_discount, can_delete_customer, can_edit_product_price`,
    [full_name, status, can_discount, can_delete_customer, can_edit_product_price, password_hash, req.params.id]
  );

  if (!result.rows[0]) return res.status(404).json({ error: "المستخدم غير موجود." });

  await logActivity({ userId: req.user.id, action: "UPDATE_USER", recordType: "user", recordId: req.params.id, newValue: result.rows[0] });
  res.json(result.rows[0]);
});

export default router;

import { Router } from "express";
import bcrypt from "bcryptjs";
import { query, logActivity } from "../db.js";

const router = Router();

router.get("/status", async (req, res) => {
  const result = await query("SELECT COUNT(*)::int AS count FROM users");
  res.json({ needsSetup: result.rows[0].count === 0 });
});

router.post("/create-first-admin", async (req, res) => {
  const { username, password, full_name } = req.body;

  const existing = await query("SELECT COUNT(*)::int AS count FROM users");
  if (existing.rows[0].count > 0) {
    return res.status(403).json({
      error: "تم إعداد النظام مسبقًا. لإضافة مستخدم جديد، استخدم لوحة إدارة المستخدمين بعد تسجيل الدخول.",
    });
  }

  if (!username || !password || !full_name) {
    return res.status(400).json({ error: "الرجاء تعبئة كل الحقول." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل." });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const result = await query(
    `INSERT INTO users (username, password_hash, full_name, role, status, can_discount, can_delete_customer, can_edit_product_price)
     VALUES ($1, $2, $3, 'admin', 'active', true, true, true)
     RETURNING id, username, full_name, role`,
    [username.trim(), password_hash, full_name.trim()]
  );

  const newAdmin = result.rows[0];
  await logActivity({
    userId: newAdmin.id,
    action: "CREATE_FIRST_ADMIN",
    recordType: "user",
    recordId: newAdmin.id,
    newValue: { username: newAdmin.username },
  });

  res.status(201).json({ message: "تم إنشاء حساب المدير الأول بنجاح.", user: newAdmin });
});

export default router;

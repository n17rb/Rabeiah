import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db.js";
import { signToken } from "../middleware/auth.js";

const router = Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "الرجاء إدخال اسم المستخدم وكلمة المرور." });
  }

  const result = await query(
    "SELECT * FROM users WHERE username = $1",
    [username.trim()]
  );
  const user = result.rows[0];

  if (!user) {
    return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة." });
  }

  if (user.status !== "active") {
    return res.status(403).json({ error: "هذا الحساب غير مفعّل. راجع الإدارة." });
  }

  const passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) {
    return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة." });
  }

  const token = signToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      can_discount: user.can_discount,
      can_delete_customer: user.can_delete_customer,
      can_edit_product_price: user.can_edit_product_price,
    },
  });
});

export default router;

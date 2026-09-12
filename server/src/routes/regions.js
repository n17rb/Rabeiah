import { Router } from "express";
import { query, logActivity } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const result = await query("SELECT * FROM regions WHERE status = 'active' ORDER BY name ASC");
  res.json(result.rows);
});

router.post("/", requireRole("admin"), async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "اسم المنطقة مطلوب." });

  const result = await query(
    "INSERT INTO regions (name) VALUES ($1) RETURNING *",
    [name.trim()]
  );
  await logActivity({ userId: req.user.id, action: "CREATE_REGION", recordType: "region", recordId: result.rows[0].id, newValue: result.rows[0] });
  res.status(201).json(result.rows[0]);
});

router.put("/:id", requireRole("admin"), async (req, res) => {
  const { name, status } = req.body;
  const result = await query(
    `UPDATE regions SET name = COALESCE($1, name), status = COALESCE($2, status) WHERE id = $3 RETURNING *`,
    [name, status, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: "المنطقة غير موجودة." });
  res.json(result.rows[0]);
});

export default router;

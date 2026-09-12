import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./db.js";

import authRoutes from "./routes/auth.js";
import setupRoutes from "./routes/setup.js";
import customerRoutes from "./routes/customers.js";
import productRoutes from "./routes/products.js";
import regionRoutes from "./routes/regions.js";
import userRoutes from "./routes/users.js";
import { UPLOADS_DIR } from "./middleware/upload.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        pin_code VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'driver',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Database tables initialized successfully!");
  } catch (err) {
    console.error("Error initializing database tables:", err);
  }
}

await initializeDatabase();
// إنشاء حساب الآدمن الافتراضي تلقائياً
async function seedDefaultAdmin() {
  try {
    const bcrypt = await import("bcryptjs");
    const existing = await pool.query("SELECT * FROM users WHERE username = $1", ["Yazan"]);
    if (existing.rows.length === 0) {
      const hashedPassword = await bcrypt.hash("Yaz#2007", 10);
      await pool.query(
        "INSERT INTO users (username, password, role) VALUES ($1, $2, $3)",
        ["Yazan", hashedPassword, "admin"]
      );
      console.log("تم إنشاء حساب الآدمن Yazan بنجاح");
    }
  } catch (e) {
    console.error("خطأ في إنشاء الآدمن:", e.message);
  }
}
await seedDefaultAdmin();


const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.use("/uploads", express.static(UPLOADS_DIR));

app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

app.use("/api/setup", setupRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/regions", regionRoutes);
app.use("/api/users", userRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "حدث خطأ غير متوقع في السيرفر." });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ السيرفر شغال على المنفذ ${PORT}`);
});

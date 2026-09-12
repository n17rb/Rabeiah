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
    // 1. إنشاء الجدول بالأعمدة الصحيحة التي يتوقعها نظام المصادقة
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        role VARCHAR(20) DEFAULT 'admin',
        full_name VARCHAR(100),
        can_discount BOOLEAN DEFAULT true,
        can_delete_customer BOOLEAN DEFAULT true,
        can_edit_product_price BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. إنشاء وتشفير حساب الآدمن Yazan تلقائياً إذا لم يكن موجوداً
    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.hash("Yaz#2007", 10);

    await pool.query(
      `INSERT INTO users (username, password_hash, status, role, full_name) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (username) 
       DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'active'`,
      ["Yazan", hashedPassword, "active", "admin", "Yazan Admin"]
    );

    console.log("Database tables initialized & Admin Yazan verified successfully!");
  } catch (err) {
    console.error("Error initializing database tables:", err);
  }
}

await initializeDatabase();

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

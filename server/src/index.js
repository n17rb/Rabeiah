import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.js";
import setupRoutes from "./routes/setup.js";
import customerRoutes from "./routes/customers.js";
import productRoutes from "./routes/products.js";
import regionRoutes from "./routes/regions.js";
import userRoutes from "./routes/users.js";
import { UPLOADS_DIR } from "./middleware/upload.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// تأكد إنه دالة التهيئة أو الـ pool مضافين، وحط هذا السطر قبل app.listen:
import { pool } from './db.js'; // أو حسب ملف الاتصال عندك

// دالة لإنشاء الجداول تلقائياً عند الإقلاع
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

// استدعِ الدالة قبل تشغيل السيرفر
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

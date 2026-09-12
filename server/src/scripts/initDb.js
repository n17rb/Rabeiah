import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, "..", "..", "schema.sql");

async function main() {
  const sql = fs.readFileSync(schemaPath, "utf-8");
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
  });

  console.log("⏳ جاري تنفيذ schema.sql على قاعدة البيانات...");
  await pool.query(sql);
  console.log("✅ تم إنشاء الجداول وإدخال المنتجات الابتدائية بنجاح.");
  await pool.end();
}

main().catch((err) => {
  console.error("❌ فشل تهيئة قاعدة البيانات:", err.message);
  process.exit(1);
});

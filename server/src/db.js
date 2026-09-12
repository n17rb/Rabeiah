import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("❌ خطأ: متغير DATABASE_URL غير موجود في ملف .env");
  process.exit(1);
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
});

export async function query(text, params) {
  return pool.query(text, params);
}

export async function logActivity({ userId, action, recordType, recordId, oldValue, newValue }) {
  await query(
    `INSERT INTO activity_log (user_id, action, record_type, record_id, old_value, new_value)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, action, recordType, recordId ?? null, oldValue ? JSON.stringify(oldValue) : null, newValue ? JSON.stringify(newValue) : null]
  );
}

import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ⚠️ ملاحظة: هذا تخزين محلي على قرص السيرفر — مناسب للتجربة المحلية.
// على استضافات مثل Render/Railway القرص مؤقت وتُمسح الصور عند إعادة التشغيل.
// عند الإنتاج الفعلي بدّل هذا الملف ليرفع لـ Cloudinary بدل القرص المحلي.

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
});

export const uploadSingleImage = upload.single("photo");

export async function saveCompressedImage(fileBuffer, prefix = "img") {
  const filename = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}.webp`;
  const filepath = path.join(UPLOADS_DIR, filename);

  await sharp(fileBuffer)
    .resize({ width: 1280, withoutEnlargement: true })
    .webp({ quality: 72 })
    .toFile(filepath);

  return filename;
}

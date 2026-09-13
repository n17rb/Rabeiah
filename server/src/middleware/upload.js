import multer from "multer";
import sharp from "sharp";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
});

export const uploadSingleImage = upload.single("photo");

export async function saveCompressedImage(fileBuffer, prefix = "img") {
  const compressed = await sharp(fileBuffer)
    .resize({ width: 1280, withoutEnlargement: true })
    .webp({ quality: 72 })
    .toBuffer();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "jawharat-al-rabya",
        public_id: `${prefix}-${Date.now()}`,
        resource_type: "image",
        overwrite: true,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result.secure_url);
      }
    );
    stream.end(compressed);
  });
}

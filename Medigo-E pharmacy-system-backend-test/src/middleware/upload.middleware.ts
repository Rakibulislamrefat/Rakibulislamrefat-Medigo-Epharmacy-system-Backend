import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary-v2";
import { NextFunction, Request, Response } from "express";
import { ApiError } from "../shared/utils";
import env from "../config/env";

// ── Configure Cloudinary ──────────────────────────────
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

// ══════════════════════════════════════════════════════
//  Cloudinary Storage — uploads to Cloudinary
// ══════════════════════════════════════════════════════
const storage = new CloudinaryStorage({
  cloudinary: cloudinary as any,
  params: {
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 800, height: 800, crop: "limit" }],
    folder: "medigo-products", // Folder in Cloudinary
  } as any,
});

// ══════════════════════════════════════════════════════
//  File filter — images only
// ══════════════════════════════════════════════════════
const imageFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, "Only JPEG, PNG and WebP images are allowed") as any);
  }
};

// ══════════════════════════════════════════════════════
//  upload.productImage — single image for products, max 5MB
//  Usage: router.post("/products", protect, upload.productImage, createProduct)
// ══════════════════════════════════════════════════════
const productImageUploader = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
}).fields([
  { name: "image", maxCount: 1 },
  { name: "images", maxCount: 1 },
]);

const productImage = (req: Request, res: Response, next: NextFunction): void => {
  productImageUploader(req, res, (err) => {
    if (err) return next(err);

    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const file = files?.image?.[0] || files?.images?.[0];
    if (file) req.file = file;

    next();
  });
};

export const upload = {
  productImage,
  avatar: multer({
    storage,
    fileFilter: imageFilter,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  }).single("avatar"),
};

// ══════════════════════════════════════════════════════
//  Cloudinary utility functions
// ══════════════════════════════════════════════════════

// Delete image from Cloudinary by public_id
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    throw new ApiError(500, "Failed to delete image from Cloudinary");
  }
};

// Extract public_id from Cloudinary URL
export const getPublicIdFromUrl = (url: string): string => {
  // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
  const parts = url.split("/");
  const publicIdWithExt = parts[parts.length - 1];
  const publicId = publicIdWithExt.split(".")[0];
  return `medigo-products/${publicId}`; // Assuming folder is medigo-products
};

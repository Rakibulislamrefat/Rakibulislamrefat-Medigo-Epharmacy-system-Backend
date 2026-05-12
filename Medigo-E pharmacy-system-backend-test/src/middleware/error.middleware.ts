import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { ApiError } from "../shared/utils";

// ══════════════════════════════════════════════════════
//  errorHandler
//  Global error handler — must be registered LAST in app.ts
//  Catches all errors thrown anywhere in the app
// ══════════════════════════════════════════════════════
export const errorHandler = (
  err:  Error | ApiError,
  req:  Request,
  res:  Response,
  _next: NextFunction
): void => {

  // ── Default values ─────────────────────────────────
  let statusCode = 500;
  let message    = "Internal server error";
  let errors: string[] | undefined;
  const isDev = process.env.NODE_ENV !== "production";
  const nestedCloudinaryError = (err as any).error;
  const rawMessage = err.message || nestedCloudinaryError?.message || "";
  const lowerMessage = rawMessage.toLowerCase();

  // ── Known ApiError ─────────────────────────────────
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message    = err.message;
    errors     = err.errors;
  }

  // ── Mongoose validation error ──────────────────────
  else if (err instanceof multer.MulterError) {
    statusCode = 400;
    message =
      err.code === "LIMIT_UNEXPECTED_FILE"
        ? "Unexpected image field. Use 'image' for the product image."
        : err.message;
  }

  else if (
    (err as any).http_code ||
    nestedCloudinaryError?.http_code ||
    lowerMessage.includes("cloudinary") ||
    lowerMessage.includes("api_key") ||
    lowerMessage.includes("cloud_name") ||
    lowerMessage.includes("upload") ||
    lowerMessage.includes("socket hang up") ||
    lowerMessage.includes("timeout")
  ) {
    statusCode = nestedCloudinaryError?.http_code === 401 ? 401 : 502;
    message = rawMessage
      ? `Image upload failed: ${rawMessage}`
      : "Image upload failed. Please check Cloudinary configuration and image file.";
  }

  else if (lowerMessage.includes("multipart")) {
    statusCode = 400;
    message = "Invalid multipart/form-data request. Send FormData without manually setting Content-Type.";
  }

  else if (err.name === "ValidationError") {
    statusCode = 400;
    message    = "Validation failed";
    errors     = Object.values((err as any).errors).map(
      (e: any) => e.message
    );
  }

  // ── Mongoose duplicate key error ───────────────────
  else if ((err as any).code === 11000) {
    statusCode = 409;
    const field = Object.keys((err as any).keyValue || {})[0];
    message    = `${field} is already taken`;
  }

  // ── Mongoose invalid ObjectId ──────────────────────
  else if (err.name === "CastError") {
    statusCode = 400;
    message    = `Invalid ${(err as any).path}: ${(err as any).value}`;
  }

  // ── JWT errors ─────────────────────────────────────
  else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message    = "Invalid token";
  }

  else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message    = "Token expired";
  }

  // ── Log in development ─────────────────────────────
  if (isDev) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}`);
    console.error(err.stack || err);
  }

  res.status(statusCode).json({
    success:    false,
    statusCode,
    message,
    ...(errors && { errors }),
    ...(isDev && { error: rawMessage, stack: err.stack }),
  });
};

// ══════════════════════════════════════════════════════
//  notFound
//  Catches requests to undefined routes
//  Register BEFORE errorHandler in app.ts
// ══════════════════════════════════════════════════════
export const notFound = (
  req:  Request,
  _res: Response,
  next: NextFunction
): void => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

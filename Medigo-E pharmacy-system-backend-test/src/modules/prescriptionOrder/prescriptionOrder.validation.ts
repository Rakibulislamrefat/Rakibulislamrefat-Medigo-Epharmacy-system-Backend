import mongoose from "mongoose";
import { z } from "zod";

const PRESCRIPTION_ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "delivered",
  "cancelled",
] as const;

const objectIdSchema = z
  .string({ required_error: "address is required" })
  .trim()
  .refine((value) => mongoose.Types.ObjectId.isValid(value), "Invalid id");

const medicinesSchema = z.preprocess((value) => {
  if (Array.isArray(value)) return value;
  if (value == null || value === "") return [];

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }

  return value;
}, z.array(objectIdSchema).optional().default([]));

export const createPrescriptionOrderSchema = z
  .object({
    address: objectIdSchema,
    medicines: medicinesSchema,
  })
  .strict();

export const updatePrescriptionOrderSchema = z
  .object({
    address: objectIdSchema.optional(),
    medicines: medicinesSchema.optional(),
    status: z.enum(PRESCRIPTION_ORDER_STATUSES).optional(),
  })
  .strict();

export type CreatePrescriptionOrderInput = z.infer<typeof createPrescriptionOrderSchema>;
export type UpdatePrescriptionOrderInput = z.infer<typeof updatePrescriptionOrderSchema>;

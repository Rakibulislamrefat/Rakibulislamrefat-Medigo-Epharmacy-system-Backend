import { z } from "zod";

export const medicineSchema = z.object({
  medicineId: z.string().optional(),
  name: z.string().min(1, "Medicine name is required"),
  dosage: z.string().min(1, "Dosage is required"),
  quantity: z.union([z.string(), z.number()]).refine(
    (val) => {
      const num = typeof val === "string" ? parseInt(val) : val;
      return num > 0;
    },
    "Quantity must be greater than 0"
  ),
});

export const verifyPrescriptionSchema = z.object({
  medicines: z
    .array(medicineSchema)
    .min(1, "At least one medicine is required"),
  verificationNotes: z.string().optional(),
});

export const rejectPrescriptionSchema = z.object({
  reason: z.string().min(5, "Rejection reason must be at least 5 characters"),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["picked", "packed", "ready_for_delivery", "delivered"]),
});

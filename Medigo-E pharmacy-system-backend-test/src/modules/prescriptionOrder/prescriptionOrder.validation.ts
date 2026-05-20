import { z } from "zod";

const PRESCRIPTION_ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "delivered",
  "cancelled",
] as const;

const objectIdSchema = z
  .string()
  .trim()
  .min(1, "Invalid id");

const optionalTrimmedString = z.string().trim().optional().default("");
const optionalUpdateString = z.string().trim().optional();

const coordinatesSchema = z
  .object({
    lat: z.coerce.number().nullable().optional().default(null),
    lng: z.coerce.number().nullable().optional().default(null),
  })
  .optional()
  .default({ lat: null, lng: null });

const updateCoordinatesSchema = z
  .object({
    lat: z.coerce.number().nullable().optional(),
    lng: z.coerce.number().nullable().optional(),
  })
  .optional();

const addressSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}, z.object({
  line1: z.string({ required_error: "Address line is required" }).trim().min(1, "Address line is required"),
  line2: optionalTrimmedString,
  city: z.string({ required_error: "City is required" }).trim().min(1, "City is required"),
  state: optionalTrimmedString,
  postcode: optionalTrimmedString,
  country: z.string({ required_error: "Country is required" }).trim().min(1, "Country is required"),
  country_code: optionalTrimmedString,
  coordinates: coordinatesSchema,
}));

const updateAddressSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}, z.object({
  line1: z.string().trim().optional(),
  line2: optionalUpdateString,
  city: z.string().trim().optional(),
  state: optionalUpdateString,
  postcode: optionalUpdateString,
  country: z.string().trim().optional(),
  country_code: optionalUpdateString,
  coordinates: updateCoordinatesSchema,
}));

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

const quantitiesSchema = z.preprocess((value) => {
  if (value == null || value === "") return {};
  if (Array.isArray(value) || typeof value === "object") return value;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return {};

    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.split(",").map((item) => Number(item.trim()));
    }
  }

  return value;
}, z.union([
  z.record(z.coerce.number().int().min(1)),
  z.array(z.coerce.number().int().min(1)),
]).optional().default({}));

export const prescriptionOrderPaymentSchema = z
  .object({
    method: z.enum(["cash_on_delivery", "online"], {
      required_error: "Payment method is required",
    }),
    customerInfo: z.record(z.any()).optional().default({}),
  })
  .strict();

export const createPrescriptionOrderSchema = z
  .object({
    userId: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    address: addressSchema.optional(),
    line1: z.string().trim().optional(),
    line2: optionalUpdateString,
    city: z.string().trim().optional(),
    state: optionalUpdateString,
    postcode: optionalUpdateString,
    country: z.string().trim().optional(),
    country_code: optionalUpdateString,
    coordinates: coordinatesSchema,
    medicines: medicinesSchema,
    quantities: quantitiesSchema,
    notes: optionalTrimmedString,
  })
  .strict()
  .transform((value) => ({
    address: value.address || {
      line1: value.line1 || "",
      line2: value.line2,
      city: value.city || "",
      state: value.state,
      postcode: value.postcode,
      country: value.country || "",
      country_code: value.country_code,
      coordinates: value.coordinates,
    },
    medicines: value.medicines,
    quantities: value.quantities,
    notes: value.notes,
  }))
  .refine((value) => value.address.line1.length > 0, "Address line is required")
  .refine((value) => value.address.city.length > 0, "City is required")
  .refine((value) => value.address.country.length > 0, "Country is required");

export const updatePrescriptionOrderSchema = z
  .object({
    userId: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    address: updateAddressSchema.optional(),
    line1: z.string().trim().optional(),
    line2: optionalUpdateString,
    city: z.string().trim().optional(),
    state: optionalUpdateString,
    postcode: optionalUpdateString,
    country: z.string().trim().optional(),
    country_code: optionalUpdateString,
    coordinates: updateCoordinatesSchema,
    medicines: medicinesSchema.optional(),
    quantities: quantitiesSchema.optional(),
    notes: optionalUpdateString,
    status: z.enum(PRESCRIPTION_ORDER_STATUSES).optional(),
  })
  .strict()
  .transform((value) => {
    const addressFields = ["line1", "line2", "city", "state", "postcode", "country", "country_code", "coordinates"];
    const hasAddressFields = addressFields.some((field) => (value as Record<string, unknown>)[field] !== undefined);

    if (!hasAddressFields) return value;

    return {
      address: value.address || {
        line1: value.line1 || "",
        line2: value.line2,
        city: value.city || "",
        state: value.state,
        postcode: value.postcode,
        country: value.country || "",
        country_code: value.country_code,
        coordinates: value.coordinates,
      },
      medicines: value.medicines,
      quantities: value.quantities,
      notes: value.notes,
      status: value.status,
    };
  });

export type CreatePrescriptionOrderInput = z.infer<typeof createPrescriptionOrderSchema>;
export type UpdatePrescriptionOrderInput = z.infer<typeof updatePrescriptionOrderSchema>;
export type PrescriptionOrderPaymentInput = z.infer<typeof prescriptionOrderPaymentSchema>;

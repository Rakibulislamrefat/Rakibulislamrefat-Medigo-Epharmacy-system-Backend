import { z } from "zod";

const coordinatesSchema = z
  .object({
    lat: z.number().nullable().optional().default(null),
    lng: z.number().nullable().optional().default(null),
  })
  .optional()
  .default({ lat: null, lng: null });

export const createAddressSchema = z
  .object({
    label: z.string().trim().optional().default("Home"),
    name: z.string().trim().optional().default(""),
    phone: z.string().trim().optional().default(""),
    line1: z.string({ required_error: "line1 is required" }).trim().min(1, "line1 is required"),
    line2: z.string().trim().optional().default(""),
    city: z.string({ required_error: "city is required" }).trim().min(1, "city is required"),
    state: z.string().trim().optional().default(""),
    postcode: z.string().trim().optional().default(""),
    country: z.string({ required_error: "country is required" }).trim().min(1, "country is required"),
    country_code: z.string().trim().optional().default(""),
    coordinates: coordinatesSchema,
    isDefault: z.boolean().optional().default(false),
  })
  .strict();

export const updateAddressSchema = createAddressSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required",
);

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;

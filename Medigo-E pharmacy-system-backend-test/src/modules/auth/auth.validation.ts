import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(64, "Password is too long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

const addressSchema = z
  .object({
    label: z.string().optional().default("Home"),
    name: z.string().optional().default(""),
    phone: z.string().optional().default(""),
    line1: z.string().optional().default(""),
    line2: z.string().optional().default(""),
    city: z.string().optional().default(""),
    state: z.string().optional().default(""),
    postcode: z.string().optional().default(""),
    country: z.string().optional().default(""),
    country_code: z.string().optional().default(""),
    coordinates: z
      .object({
        lat: z.number().nullable().default(null),
        lng: z.number().nullable().default(null),
      })
      .optional()
      .default({ lat: null, lng: null }),
    isDefault: z.boolean().optional().default(false),
  })
  .strict();

// ══════════════════════════════════════════════════════
//  REGISTER
// ══════════════════════════════════════════════════════
export const registerSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(50),
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .email("Invalid email address")
    .toLowerCase(),
  phone: z
    .string({ required_error: "Phone number is required" })
    .trim(),
  password: passwordSchema,
  avatar: z.string().trim().url("Invalid avatar URL").nullable().optional(),
  role: z.enum(["user", "pharmacist", "doctor", "hospital"]).optional().default("user"),
  addresses: z.array(addressSchema).optional(),
});

// ══════════════════════════════════════════════════════
//  LOGIN
// ══════════════════════════════════════════════════════
export const loginSchema = z.object({
  identifier: z.string().min(1, "Email or phone is required"),
  password: z.string().min(1, "Password is required"),
});

// ══════════════════════════════════════════════════════
//  FORGOT PASSWORD
// ══════════════════════════════════════════════════════
export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Invalid email address").toLowerCase(),
});

// ══════════════════════════════════════════════════════
//  RESET PASSWORD
// ══════════════════════════════════════════════════════
export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: passwordSchema,
});

// ══════════════════════════════════════════════════════
//  EMAIL OTP
// ══════════════════════════════════════════════════════
export const sendOtpSchema = z.object({
  email: z.string().trim().email("Invalid email address").toLowerCase(),
});

export const verifyOtpSchema = z.object({
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  otp: z
    .string()
    .regex(/^\d{6}$/, "OTP must be a 6-digit code"),
});

// ── Inferred TypeScript types ──────────────────────────
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

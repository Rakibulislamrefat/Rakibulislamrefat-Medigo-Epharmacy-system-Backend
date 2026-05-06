import { Schema, model, Types } from "mongoose";

export type UserRole = "user" | "admin" | "pharmacist" | "doctor" | "hospital";
export type UserStatus = "active" | "blocked" | "pending";

const AddressSchema = new Schema(
  {
    label: { type: String, default: "Home" },
    name: { type: String, default: "" },
    phone: { type: String, default: "" },

    line1: { type: String, default: "" },
    line2: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    postcode: { type: String, default: "" },
    country: { type: String, default: "" },
    country_code: { type: String, default: "" },

    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },

    isDefault: { type: Boolean, default: false },
  },
  { _id: false },
);

const UserSchema = new Schema(
  {
    role: { type: String, enum: ["user", "admin", "pharmacist", "doctor"], default: "user", index: true },
    status: { type: String, enum: ["active", "blocked", "pending"], default: "pending", index: true },

    name: { type: String, required: true, trim: true },
    avatar: { type: String, default: "" },

    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },

    passwordHash: { type: String, required: true, select: false },

    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },

    addresses: { type: [AddressSchema], default: [] },

    location: {
      city: { type: String, default: "" },
      country: { type: String, default: "" },
      country_code: { type: String, default: "" },
      county: { type: String, default: "" },
      postcode: { type: String, default: "" },
      state: { type: String, default: "" },
      state_district: { type: String, default: "" },
      coordinates: { lat: { type: Number, default: null }, lng: { type: Number, default: null } },
    },

    refreshTokenHash: { type: String, select: false, default: null },
    lastLoginAt: { type: Date, default: null },

    passwordResetAttempts: { type: Number, default: 0 },
    passwordResetLockedUntil: { type: Date, default: null },
    passwordResetToken: { type: String, default: null, select: false },
    passwordResetExpires: { type: Date, default: null },

    emailVerificationCode: { type: String, default: null, select: false },
    emailVerificationExpires: { type: Date, default: null },
    emailVerificationAttempts: { type: Number, default: 0 },
    emailVerificationBlockedUntil: { type: Date, default: null },

    security: {
      loginAttempts: { type: Number, default: 0 },
      lockedUntil: { type: Date, default: null },
      lastLoginAt: { type: Date, default: null },
      lastLoginIp: { type: String, default: null },
      lastLoginDevice: { type: String, default: null },
      twoFactorEnabled: { type: Boolean, default: false },
      twoFactorSecret: { type: String, default: null, select: false },
      passwordChangedAt: { type: Date, default: null },
      activeSessions: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ phone: 1 }, { unique: true, sparse: true });

export const User = model("User", UserSchema);
export default User;

import mongoose, { Schema, Types } from "mongoose";

export type EUserRole = "user" | "admin" | "pharmacist" | "doctor" | "hospital";
export type EUserStatus = "active" | "blocked" | "pending";

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

const EUserSchema = new Schema(
  {
    role: {
      type: String,
      enum: ["user", "admin", "pharmacist", "doctor", "hospital"],
      default: "user",
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "blocked", "pending"],
      default: "pending",
      index: true,
    },
    name: { type: String, required: true, trim: true },
    avatar: { type: String, default: "" },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
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
  },
  { timestamps: true },
);

EUserSchema.index({ email: 1 }, { unique: true, sparse: true });
EUserSchema.index({ phone: 1 }, { unique: true, sparse: true });

export const EUser =
  (mongoose.models.EUser as mongoose.Model<any>) || mongoose.model("EUser", EUserSchema);

export type MedicineStatus = "active" | "inactive";
export type DosageForm = "tablet" | "capsule" | "syrup" | "injection" | "cream" | "drops" | "other";

const EMedicineSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    genericName: { type: String, default: "", trim: true, index: true },
    brandName: { type: String, default: "", trim: true, index: true },
    dosageForm: {
      type: String,
      enum: ["tablet", "capsule", "syrup", "injection", "cream", "drops", "other"],
      default: "other",
    },
    strength: { type: String, default: "" },
    description: { type: String, default: "" },
    indications: { type: [String], default: [] },
    warnings: { type: [String], default: [] },
    otc: { type: Boolean, default: true },
    requiresPrescription: { type: Boolean, default: false },
    categories: { type: [String], default: [], index: true },
    tags: { type: [String], default: [] },
    images: { type: [String], default: [] },
    sku: { type: String, default: "", index: true },
    manufacturer: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, default: null, min: 0 },
    currency: { type: String, default: "BDT" },
    stockQty: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
  },
  { timestamps: true },
);

EMedicineSchema.index({ name: "text", genericName: "text", brandName: "text" });

export const EMedicine =
  (mongoose.models.EMedicine as mongoose.Model<any>) ||
  mongoose.model("EMedicine", EMedicineSchema);

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type PaymentStatus = "unpaid" | "paid" | "failed" | "refunded";

const OrderItemSchema = new Schema(
  {
    medicine: { type: Types.ObjectId, ref: "EMedicine", required: true },
    nameSnapshot: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const EOrderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    user: { type: Types.ObjectId, ref: "EUser", required: true, index: true },
    items: { type: [OrderItemSchema], default: [] },
    status: {
      type: String,
      enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"],
      default: "pending",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "failed", "refunded"],
      default: "unpaid",
      index: true,
    },
    subtotal: { type: Number, default: 0, min: 0 },
    discountTotal: { type: Number, default: 0, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, default: 0, min: 0 },
    contactName: { type: String, default: "" },
    contactPhone: { type: String, default: "" },
    deliveryAddress: {
      line1: { type: String, default: "" },
      line2: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      postcode: { type: String, default: "" },
      country: { type: String, default: "" },
      country_code: { type: String, default: "" },
      coordinates: { lat: { type: Number, default: null }, lng: { type: Number, default: null } },
    },
    notes: { type: String, default: "" },
    prescriptionRequired: { type: Boolean, default: false },
    prescription: { type: Types.ObjectId, ref: "EPrescription", default: null },
    appliedCoupon: { type: Types.ObjectId, ref: "ECoupon", default: null },
  },
  { timestamps: true },
);

EOrderSchema.index({ user: 1, createdAt: -1 });

export const EOrder =
  (mongoose.models.EOrder as mongoose.Model<any>) || mongoose.model("EOrder", EOrderSchema);

export type DoctorStatus = "active" | "inactive";

const EDoctorSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "EUser", required: true, unique: true },
    fullName: { type: String, required: true, trim: true, index: true },
    specialization: { type: String, default: "", index: true },
    registrationNumber: { type: String, default: "", index: true },
    bio: { type: String, default: "" },
    languages: { type: [String], default: ["English"] },
    fee: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "BDT" },
    modes: { type: [String], default: ["chat"] },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
  },
  { timestamps: true },
);

export const EDoctor =
  (mongoose.models.EDoctor as mongoose.Model<any>) ||
  mongoose.model("EDoctor", EDoctorSchema);

export type ConsultancyStatus = "requested" | "confirmed" | "completed" | "cancelled";

const EConsultancySchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "EUser", required: true, index: true },
    doctor: { type: Types.ObjectId, ref: "EDoctor", required: true, index: true },
    status: {
      type: String,
      enum: ["requested", "confirmed", "completed", "cancelled"],
      default: "requested",
      index: true,
    },
    mode: { type: String, enum: ["chat", "video", "audio", "in_person"], default: "chat" },
    scheduledAt: { type: Date, default: null, index: true },
    durationMinutes: { type: Number, default: 15, min: 5 },
    symptoms: { type: String, default: "" },
    notes: { type: String, default: "" },
    attachments: { type: [String], default: [] },
    meetingLink: { type: String, default: "" },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "failed", "refunded"],
      default: "unpaid",
      index: true,
    },
    transaction: { type: Types.ObjectId, ref: "EPaymentTransaction", default: null },
  },
  { timestamps: true },
);

EConsultancySchema.index({ doctor: 1, scheduledAt: 1 });

export const EConsultancy =
  (mongoose.models.EConsultancy as mongoose.Model<any>) ||
  mongoose.model("EConsultancy", EConsultancySchema);

export type PrescriptionStatus = "submitted" | "verified" | "rejected";

const EPrescriptionSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "EUser", required: true, index: true },
    files: { type: [String], required: true },
    status: { type: String, enum: ["submitted", "verified", "rejected"], default: "submitted", index: true },
    note: { type: String, default: "" },
    verifiedBy: { type: Types.ObjectId, ref: "EUser", default: null },
    verifiedAt: { type: Date, default: null },
    linkedOrder: { type: Types.ObjectId, ref: "EOrder", default: null },
  },
  { timestamps: true },
);

export const EPrescription =
  (mongoose.models.EPrescription as mongoose.Model<any>) ||
  mongoose.model("EPrescription", EPrescriptionSchema);

export type TxStatus = "initiated" | "success" | "failed" | "refunded";

const EPaymentTransactionSchema = new Schema(
  {
    order: { type: Types.ObjectId, ref: "EOrder", required: true, index: true },
    user: { type: Types.ObjectId, ref: "EUser", required: true, index: true },
    provider: { type: String, default: "manual" },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "BDT" },
    status: {
      type: String,
      enum: ["initiated", "success", "failed", "refunded"],
      default: "initiated",
      index: true,
    },
    reference: { type: String, default: "", index: true },
    raw: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export const EPaymentTransaction =
  (mongoose.models.EPaymentTransaction as mongoose.Model<any>) ||
  mongoose.model("EPaymentTransaction", EPaymentTransactionSchema);

const CartItemSchema = new Schema(
  {
    medicine: { type: Types.ObjectId, ref: "EMedicine", required: true },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const ECartSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "EUser", required: true, unique: true },
    items: { type: [CartItemSchema], default: [] },
  },
  { timestamps: true },
);

export const ECart =
  (mongoose.models.ECart as mongoose.Model<any>) || mongoose.model("ECart", ECartSchema);

const EReviewSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "EUser", required: true, index: true },
    medicine: { type: Types.ObjectId, ref: "EMedicine", required: true, index: true },
    order: { type: Types.ObjectId, ref: "EOrder", default: null },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "" },
  },
  { timestamps: true },
);

EReviewSchema.index({ user: 1, medicine: 1 }, { unique: true });

export const EReview =
  (mongoose.models.EReview as mongoose.Model<any>) ||
  mongoose.model("EReview", EReviewSchema);

export type CouponType = "percentage" | "fixed";

const ECouponSchema = new Schema(
  {
    code: { type: String, required: true, uppercase: true, trim: true, unique: true, index: true },
    type: { type: String, enum: ["percentage", "fixed"], required: true },
    value: { type: Number, required: true, min: 0 },
    minOrder: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, default: null, min: 0 },
    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null },
    active: { type: Boolean, default: true, index: true },
    usageLimit: { type: Number, default: null, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

export const ECoupon =
  (mongoose.models.ECoupon as mongoose.Model<any>) ||
  mongoose.model("ECoupon", ECouponSchema);

const EBranchSchema = new Schema(
  {
    name: { type: String, required: true, index: true },
    address: { type: String, default: "" },
    city: { type: String, default: "", index: true },
    phone: { type: String, default: "" },
    mapQuery: { type: String, default: "" },
    coordinates: { lat: { type: Number, default: null }, lng: { type: Number, default: null } },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const EBranch =
  (mongoose.models.EBranch as mongoose.Model<any>) ||
  mongoose.model("EBranch", EBranchSchema);

const ENotificationSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "EUser", required: true, index: true },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    readAt: { type: Date, default: null, index: true },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export const ENotification =
  (mongoose.models.ENotification as mongoose.Model<any>) ||
  mongoose.model("ENotification", ENotificationSchema);

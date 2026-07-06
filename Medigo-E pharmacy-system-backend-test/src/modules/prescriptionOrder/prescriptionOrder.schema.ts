import mongoose, { Schema, model, Types } from "mongoose";

export type PrescriptionOrderStatus =
  | "pending_ocr"
  | "pending_verification"
  | "verified"
  | "confirmed"
  | "processing"
  | "delivered"
  | "cancelled"
  | "rejected";

export type PrescriptionOrderPaymentStatus = "unpaid" | "paid" | "failed" | "cod_pending";
export type PrescriptionOrderPaymentMethod = "cash_on_delivery" | "online";

const PrescriptionOrderSchema = new Schema(
  {
    prescriptionFile: {
      type: String,
      required: true,
      trim: true,
    },
    // OCR fields
    extractedText: {
      type: String,
      default: "",
    },
    ocrProcessedAt: {
      type: Date,
      default: null,
    },
    verifiedBy: {
      type: Types.ObjectId,
      ref: "User",
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    verificationNotes: {
      type: String,
      default: "",
    },
    user: {
      userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
      name: { type: String, required: true, trim: true },
      email: { type: String, default: "", trim: true, lowercase: true },
      phone: { type: String, default: "", trim: true },
    },
    address: {
      line1: { type: String, required: true, trim: true },
      line2: { type: String, default: "", trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, default: "", trim: true },
      postcode: { type: String, default: "", trim: true },
      country: { type: String, required: true, trim: true },
      country_code: { type: String, default: "", trim: true },
      coordinates: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
      },
    },
    medicines: {
      type: [
        {
          medicineId: { type: Types.ObjectId, ref: "Product", required: true },
          name: { type: String, required: true, trim: true },
          genericName: { type: String, default: "", trim: true },
          brandName: { type: String, default: "", trim: true },
          quantity: { type: Number, default: 1, min: 1 },
          price: { type: Number, default: 0, min: 0 },
          salePrice: { type: Number, default: null, min: 0 },
          images: { type: [String], default: [] },
          requiresPrescription: { type: Boolean, default: false },
          status: { type: String, default: "active" },
        },
      ],
      default: [],
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending_ocr", "pending_verification", "verified", "confirmed", "processing", "delivered", "cancelled", "rejected"],
      default: "pending_ocr",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "failed", "cod_pending"],
      default: "unpaid",
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cash_on_delivery", "online", null],
      default: null,
    },
    paymentInfo: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

PrescriptionOrderSchema.index({ "user.userId": 1, createdAt: -1 });

export const PrescriptionOrder =
  (mongoose.models.PrescriptionOrder as mongoose.Model<any>) ||
  model("PrescriptionOrder", PrescriptionOrderSchema);

export default PrescriptionOrder;

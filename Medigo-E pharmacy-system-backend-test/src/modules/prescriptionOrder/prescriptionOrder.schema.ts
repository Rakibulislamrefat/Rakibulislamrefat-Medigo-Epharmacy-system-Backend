import mongoose, { Schema, model, Types } from "mongoose";

export type PrescriptionOrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "delivered"
  | "cancelled";

const PrescriptionOrderSchema = new Schema(
  {
    prescriptionFile: {
      type: String,
      required: true,
      trim: true,
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
      enum: ["pending", "confirmed", "processing", "delivered", "cancelled"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true },
);

PrescriptionOrderSchema.index({ "user.userId": 1, createdAt: -1 });

export const PrescriptionOrder =
  (mongoose.models.PrescriptionOrder as mongoose.Model<any>) ||
  model("PrescriptionOrder", PrescriptionOrderSchema);

export default PrescriptionOrder;

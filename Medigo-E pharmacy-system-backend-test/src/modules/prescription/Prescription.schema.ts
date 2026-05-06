import mongoose, { Schema, model, Types } from "mongoose";

export type PrescriptionStatus = "submitted" | "verified" | "rejected";

const PrescriptionSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", required: true, index: true },
    files: { type: [String], required: true },
    status: { type: String, enum: ["submitted", "verified", "rejected"], default: "submitted", index: true },
    note: { type: String, default: "" },
    verifiedBy: { type: Types.ObjectId, ref: "User", default: null },
    verifiedAt: { type: Date, default: null },
    linkedOrder: { type: Types.ObjectId, ref: "Order", default: null },
  },
  { timestamps: true },
);

export const Prescription =
  (mongoose.models.Prescription as mongoose.Model<any>) ||
  model("Prescription", PrescriptionSchema);

export default Prescription;


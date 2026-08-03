import mongoose, { Schema, model, Types } from "mongoose";

export type PrescriptionStatus = "pending" | "submitted" | "verified" | "rejected" | "completed" | "cancelled";

const PrescriptionSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", default: null, index: true },
    order: { type: Types.ObjectId, ref: "Order", default: null, index: true },
    prescriptionOrderId: { type: Types.ObjectId, ref: "PrescriptionOrder", default: null, index: true },
    prescriptionFile: { type: String, default: "" },
    extractedText: { type: String, default: "" },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "submitted", "verified", "rejected", "completed", "cancelled"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true },
);

const Prescription =
  (mongoose.models.Prescription as mongoose.Model<any>) || model("Prescription", PrescriptionSchema);

export default Prescription;

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
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    address: {
      type: Types.ObjectId,
      required: true,
    },
    medicines: {
      type: [{ type: Types.ObjectId, ref: "Product" }],
      default: [],
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

PrescriptionOrderSchema.index({ user: 1, createdAt: -1 });

export const PrescriptionOrder =
  (mongoose.models.PrescriptionOrder as mongoose.Model<any>) ||
  model("PrescriptionOrder", PrescriptionOrderSchema);

export default PrescriptionOrder;

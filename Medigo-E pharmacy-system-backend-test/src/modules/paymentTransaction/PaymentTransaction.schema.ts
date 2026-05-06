import mongoose, { Schema, model, Types } from "mongoose";

export type TxStatus = "initiated" | "success" | "failed" | "refunded";

const PaymentTransactionSchema = new Schema(
  {
    order: { type: Types.ObjectId, ref: "Order", required: true, index: true },
    user: { type: Types.ObjectId, ref: "User", required: true, index: true },
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

export const PaymentTransaction =
  (mongoose.models.PaymentTransaction as mongoose.Model<any>) ||
  model("PaymentTransaction", PaymentTransactionSchema);

export default PaymentTransaction;


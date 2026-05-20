import mongoose, { Schema, model, Types } from "mongoose";

export type TxStatus = "initiated" | "success" | "failed" | "refunded";

const PaymentTransactionSchema = new Schema(
  {
    order: { type: Types.ObjectId, ref: "Order", default: null, index: true },
    prescriptionOrder: { type: Types.ObjectId, ref: "PrescriptionOrder", default: null, index: true },
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

PaymentTransactionSchema.pre("validate", function (next) {
  if (!(this as any).order && !(this as any).prescriptionOrder) {
    return next(new Error("order or prescriptionOrder is required"));
  }
  next();
});

export const PaymentTransaction =
  (mongoose.models.PaymentTransaction as mongoose.Model<any>) ||
  model("PaymentTransaction", PaymentTransactionSchema);

export default PaymentTransaction;


import mongoose, { Schema, model } from "mongoose";

export type CouponType = "percentage" | "fixed";

const CouponSchema = new Schema(
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

export const Coupon =
  (mongoose.models.Coupon as mongoose.Model<any>) || model("Coupon", CouponSchema);

export default Coupon;


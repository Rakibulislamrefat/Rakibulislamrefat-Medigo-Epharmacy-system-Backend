import mongoose, { Schema, model, Types } from "mongoose";

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
    product: { type: Types.ObjectId, ref: "Product", required: true },
    nameSnapshot: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const OrderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    user: { type: Types.ObjectId, ref: "User", required: true, index: true },
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
    prescription: { type: Types.ObjectId, ref: "Prescription", default: null },
    appliedCoupon: { type: Types.ObjectId, ref: "Coupon", default: null },
  },
  { timestamps: true },
);

OrderSchema.index({ user: 1, createdAt: -1 });

export const Order =
  (mongoose.models.Order as mongoose.Model<any>) || model("Order", OrderSchema);

export default Order;


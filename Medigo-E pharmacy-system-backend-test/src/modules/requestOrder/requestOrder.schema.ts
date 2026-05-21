import mongoose, { Schema, model } from "mongoose";

export type RequestOrderStatus = "pending" | "confirmed" | "cancelled";

const RequestOrderItemSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    price: {
      type: Number,
      default: null,
      min: 0,
    },
  },
  { _id: false }
);

const RequestOrderSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    deliveryAddress: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    deliveryNotes: {
      type: String,
      default: "",
      trim: true,
    },
    items: {
      type: [RequestOrderItemSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["sslcommerz", "cod"],
      default: null,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    pharmacistNotes: {
      type: String,
      default: "",
      trim: true,
    },
    transactionId: {
      type: String,
      default: null,
      index: true,
    },
    meta: {
      ip: { type: String, default: "" },
      userAgent: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

export const RequestOrder =
  (mongoose.models.RequestOrder as mongoose.Model<any>) ||
  model("RequestOrder", RequestOrderSchema);

export default RequestOrder;

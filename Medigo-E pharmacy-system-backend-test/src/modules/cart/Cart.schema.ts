import mongoose, { Schema, model, Types } from "mongoose";

const CartItemSchema = new Schema(
  {
    product: { type: Types.ObjectId, ref: "Product", required: true },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const CartSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", required: true, unique: true },
    items: { type: [CartItemSchema], default: [] },
  },
  { timestamps: true },
);

export const Cart =
  (mongoose.models.Cart as mongoose.Model<any>) || model("Cart", CartSchema);

export default Cart;


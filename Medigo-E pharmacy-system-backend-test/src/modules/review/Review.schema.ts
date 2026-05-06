import mongoose, { Schema, model, Types } from "mongoose";

const ReviewSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", required: true, index: true },
    product: { type: Types.ObjectId, ref: "Product", required: true, index: true },
    order: { type: Types.ObjectId, ref: "Order", default: null },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "" },
  },
  { timestamps: true },
);

ReviewSchema.index({ user: 1, product: 1 }, { unique: true });

export const Review =
  (mongoose.models.Review as mongoose.Model<any>) || model("Review", ReviewSchema);

export default Review;


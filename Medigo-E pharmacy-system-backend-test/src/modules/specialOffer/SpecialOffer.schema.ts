import mongoose, { Schema, model } from "mongoose";

const SpecialOfferSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    discount: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true, index: true },
    expiry: { type: Date, default: null },
    image: { type: String, default: "" },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const SpecialOffer =
  (mongoose.models.SpecialOffer as mongoose.Model<any>) || model("SpecialOffer", SpecialOfferSchema);

export default SpecialOffer;

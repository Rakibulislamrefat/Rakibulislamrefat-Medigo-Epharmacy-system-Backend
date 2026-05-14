import mongoose, { Schema, model, Types } from "mongoose";

const AddressItemSchema = new Schema(
  {
    label: { type: String, default: "Home", trim: true },
    name: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, default: "", trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, default: "", trim: true },
    postcode: { type: String, default: "", trim: true },
    country: { type: String, required: true, trim: true },
    country_code: { type: String, default: "", trim: true },
    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    isDefault: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

const AddressSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    addresses: { type: [AddressItemSchema], default: [] },
  },
  { timestamps: true },
);

export const Address =
  (mongoose.models.Address as mongoose.Model<any>) || model("Address", AddressSchema);

export default Address;

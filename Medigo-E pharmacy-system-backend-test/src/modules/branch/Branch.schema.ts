import mongoose, { Schema, model } from "mongoose";

const BranchSchema = new Schema(
  {
    name: { type: String, required: true, index: true },
    address: { type: String, default: "" },
    city: { type: String, default: "", index: true },
    phone: { type: String, default: "" },
    mapQuery: { type: String, default: "" },
    coordinates: { lat: { type: Number, default: null }, lng: { type: Number, default: null } },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const Branch =
  (mongoose.models.Branch as mongoose.Model<any>) || model("Branch", BranchSchema);

export default Branch;


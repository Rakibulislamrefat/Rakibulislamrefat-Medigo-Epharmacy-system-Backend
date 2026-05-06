import mongoose, { Schema, model, Types } from "mongoose";

export type DoctorStatus = "active" | "inactive";

const DoctorSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", required: true, unique: true },
    fullName: { type: String, required: true, trim: true, index: true },
    specialization: { type: String, default: "", index: true },
    registrationNumber: { type: String, default: "", index: true },
    bio: { type: String, default: "" },
    languages: { type: [String], default: ["English"] },
    fee: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "BDT" },
    modes: { type: [String], default: ["chat"] },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
  },
  { timestamps: true },
);

export const Doctor =
  (mongoose.models.Doctor as mongoose.Model<any>) || model("Doctor", DoctorSchema);

export default Doctor;


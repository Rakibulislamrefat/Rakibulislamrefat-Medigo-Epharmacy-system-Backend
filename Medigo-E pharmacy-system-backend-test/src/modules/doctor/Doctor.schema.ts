import mongoose, { Schema, model } from "mongoose";

export type DoctorStatus = "active" | "inactive";
export type ConsultationType = "online" | "in-person" | "both";

const AvailabilitySlotSchema = new Schema(
  {
    day: {
      type: String,
      enum: ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
      required: true,
    },
    startTime: { type: String, required: true },
    endTime:   { type: String, required: true },
  },
  { _id: false }
);

const DoctorSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    profileImage: {
      type: String,
      default: "",
    },

    qualifications: {
      type: [String],
      default: [],
    },

    specialization: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    experienceYears: {
      type: Number,
      default: 0,
      min: 0,
    },

    consultationType: {
      type: String,
      enum: ["online", "in-person", "both"],
      default: "online",
      index: true,
    },

    city: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    availability: {
      type: [AvailabilitySlotSchema],
      default: [],
    },

    nextAvailableAt: {
      type: Date,
      default: null,
      index: true,
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },

    fee: {
      type: Number,
      default: 0,
      min: 0,
    },

    currency: {
      type: String,
      default: "BDT",
    },

    registrationNumber: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    bio: {
      type: String,
      default: "",
    },

    languages: {
      type: [String],
      default: ["Bengali"],
    },

    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

// Ensure any user reference is unique but ignore documents without `user` (sparse)
DoctorSchema.index({ user: 1 }, { unique: true, sparse: true });

export const Doctor =
  (mongoose.models.Doctor as mongoose.Model<any>) || model("Doctor", DoctorSchema);

export default Doctor;

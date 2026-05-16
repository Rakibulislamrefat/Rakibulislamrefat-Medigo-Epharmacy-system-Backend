import mongoose, { Schema, model, Types } from "mongoose";

export type ConsultancyStatus = "requested" | "confirmed" | "ready" | "completed" | "cancelled";

const ConsultancySchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", default: null, index: true },
    doctor: { type: Types.ObjectId, ref: "Doctor", required: true, index: true },
    patientName: { type: String, default: "" },
    contactPhone: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
    status: {
      type: String,
      enum: ["requested", "confirmed", "ready", "completed", "cancelled"],
      default: "requested",
      index: true,
    },
    mode: { type: String, enum: ["chat", "video", "audio", "in_person"], default: "chat" },
    scheduledAt: { type: Date, default: null, index: true },
    durationMinutes: { type: Number, default: 15, min: 5 },
    symptoms: { type: String, default: "" },
    notes: { type: String, default: "" },
    attachments: { type: [String], default: [] },
    meetingLink: { type: String, default: "" },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "failed", "refunded"],
      default: "unpaid",
      index: true,
    },
    transaction: { type: Types.ObjectId, ref: "PaymentTransaction", default: null },
  },
  { timestamps: true },
);

ConsultancySchema.index({ doctor: 1, scheduledAt: 1 });

export const Consultancy =
  (mongoose.models.Consultancy as mongoose.Model<any>) ||
  model("Consultancy", ConsultancySchema);

export default Consultancy;


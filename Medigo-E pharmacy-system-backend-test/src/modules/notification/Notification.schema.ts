import mongoose, { Schema, model, Types } from "mongoose";

const NotificationSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    readAt: { type: Date, default: null, index: true },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export const Notification =
  (mongoose.models.Notification as mongoose.Model<any>) ||
  model("Notification", NotificationSchema);

export default Notification;

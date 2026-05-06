import mongoose from "mongoose";
import Notification from "./Notification.schema";
import { ApiError, paginate } from "../../shared/utils";

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export class NotificationService {
  static async create(payload: any) {
    const { user, title } = payload || {};
    if (!user) throw new ApiError(400, "user is required");
    if (!isValidId(String(user))) throw new ApiError(400, "Invalid user id");
    if (!title) throw new ApiError(400, "title is required");
    const created = await Notification.create(payload);
    return created;
  }

  static async listForUser(userId: string, query: any) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user id");
    const { skip, limit, page, totalPages } = paginate(query || {});
    const filter: any = { user: userId };
    if (query?.unread === "true" || query?.unread === true) filter.readAt = null;
    const [items, total] = await Promise.all([
      Notification.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Notification.countDocuments(filter),
    ]);
    return { items, pagination: { total, page, limit, totalPages: totalPages(total) } };
  }

  static async markRead(userId: string, notificationId: string) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user id");
    if (!isValidId(notificationId)) throw new ApiError(400, "Invalid notification id");
    const updated = await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { $set: { readAt: new Date() } },
      { new: true },
    );
    if (!updated) throw new ApiError(404, "Notification not found");
    return updated;
  }
}


import mongoose from "mongoose";
import User from "./User.schema";
import { ApiError, paginate } from "../../shared/utils";

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export class UserService {
  static async getPublicProfile(userId: string) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user ID");
    const user = await User.findOne({ _id: userId, isActive: true, isDeleted: false }).select(
      "name avatar role status createdAt",
    );
    if (!user) throw new ApiError(404, "User not found");
    return user;
  }

  static async listUsers(query: any) {
    const { skip, limit, page, totalPages } = paginate(query || {});
    const filter: Record<string, any> = { isDeleted: false };

    if (query?.role) filter.role = query.role;
    if (query?.status) filter.status = query.status;
    if (query?.isActive != null) filter.isActive = query.isActive === "true" || query.isActive === true;

    if (query?.search) {
      filter.$or = [
        { name: { $regex: String(query.search), $options: "i" } },
        { email: { $regex: String(query.search), $options: "i" } },
        { phone: { $regex: String(query.search), $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      User.find(filter)
        .select("name email phone avatar role status isActive isEmailVerified isPhoneVerified createdAt")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);

    return { items, pagination: { total, page, limit, totalPages: totalPages(total) } };
  }

  static async updateUserStatus(userId: string, status: string) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user ID");
    if (!["active", "blocked", "pending"].includes(status)) {
      throw new ApiError(400, "Invalid status");
    }
    const updated = await User.findByIdAndUpdate(userId, { $set: { status } }, { new: true }).select(
      "name email phone role status isActive",
    );
    if (!updated) throw new ApiError(404, "User not found");
    return updated;
  }

  static async updateAvatar(userId: string, avatarUrl: string) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user ID");
    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: { avatar: avatarUrl } },
      { new: true },
    ).select("avatar");
    if (!updated) throw new ApiError(404, "User not found");
    return updated;
  }

  static async promoteToAdminDev(identifier: { email?: string; userId?: string }) {
    if (process.env.NODE_ENV === "production") {
      throw new ApiError(403, "This endpoint is disabled in production");
    }

    const { email, userId } = identifier;
    if (!email && !userId) throw new ApiError(400, "email or userId is required");
    if (userId && !isValidId(userId)) throw new ApiError(400, "Invalid user ID");

    const normalizedEmail = email ? email.toLowerCase().trim() : null;
    const user = await User.findOne(userId ? { _id: userId } : { email: normalizedEmail }).select(
      "name email role status",
    );
    if (!user) throw new ApiError(404, "User not found");

    user.role = "admin" as any;
    if (user.status === "pending") user.status = "active" as any;
    await user.save();

    return user;
  }
}


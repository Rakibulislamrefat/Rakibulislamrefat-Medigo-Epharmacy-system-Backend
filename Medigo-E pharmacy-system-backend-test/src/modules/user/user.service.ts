import mongoose from "mongoose";
import User from "./User.schema";
import { ApiError, paginate } from "../../shared/utils";

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

const profileFields = "name email phone avatar role status isEmailVerified isPhoneVerified addresses lastLoginAt createdAt updatedAt";
const addressFields = [
  "label",
  "name",
  "phone",
  "line1",
  "line2",
  "city",
  "state",
  "postcode",
  "country",
  "country_code",
  "coordinates",
  "isDefault",
] as const;

export class UserService {
  static async getPublicProfile(userId: string) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user ID");
    const user = await User.findOne({ _id: userId, isActive: true, isDeleted: false }).select(
      "name avatar role status createdAt",
    );
    if (!user) throw new ApiError(404, "User not found");
    return user;
  }

  static async getMyProfile(userId: string) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user ID");
    const user = await User.findOne({ _id: userId, isActive: true, isDeleted: false }).select(profileFields);
    if (!user) throw new ApiError(404, "User not found");
    return user;
  }

  static async updateMyProfile(userId: string, payload: Record<string, any>) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user ID");

    const user = await User.findOne({ _id: userId, isActive: true, isDeleted: false });
    if (!user) throw new ApiError(404, "User not found");

    const updates: Record<string, any> = {};
    for (const field of ["name", "email", "phone"] as const) {
      if (payload[field] !== undefined) {
        if (typeof payload[field] !== "string") throw new ApiError(400, `${field} must be a string`);
        updates[field] = payload[field].trim();
      }
    }

    if (updates.name !== undefined && updates.name.length < 2) {
      throw new ApiError(400, "Name must be at least 2 characters");
    }
    if (updates.email !== undefined) {
      if (!updates.email || !/^\S+@\S+\.\S+$/.test(updates.email)) {
        throw new ApiError(400, "Invalid email address");
      }
      updates.email = updates.email.toLowerCase();
    }

    if (payload.address !== undefined) {
      if (!payload.address || typeof payload.address !== "object" || Array.isArray(payload.address)) {
        throw new ApiError(400, "address must be an object");
      }

      const existingAddresses = ((user as any).addresses || []).map((address: any) => address.toObject?.() || address);
      const defaultIndex = Math.max(0, existingAddresses.findIndex((address: any) => address.isDefault));
      const existing = existingAddresses[defaultIndex] || { isDefault: true };
      const addressUpdate = Object.fromEntries(
        addressFields
          .filter((field) => payload.address[field] !== undefined)
          .map((field) => [field, payload.address[field]]),
      );

      for (const field of ["label", "name", "phone", "line1", "line2", "city", "state", "postcode", "country", "country_code"]) {
        if (addressUpdate[field] !== undefined && typeof addressUpdate[field] !== "string") {
          throw new ApiError(400, `address.${field} must be a string`);
        }
      }
      if (addressUpdate.coordinates !== undefined) {
        const coordinates = addressUpdate.coordinates;
        if (!coordinates || typeof coordinates !== "object" || !Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lng)) {
          throw new ApiError(400, "address.coordinates must contain numeric lat and lng values");
        }
      }
      if (addressUpdate.isDefault !== undefined && typeof addressUpdate.isDefault !== "boolean") {
        throw new ApiError(400, "address.isDefault must be a boolean");
      }

      updates.addresses = [...existingAddresses];
      updates.addresses[defaultIndex] = { ...existing, ...addressUpdate, isDefault: true };
    }

    if (Object.keys(updates).length === 0) {
      throw new ApiError(400, "Provide at least one profile field to update");
    }

    Object.assign(user, updates);
    await user.save();
    return User.findById(userId).select(profileFields);
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


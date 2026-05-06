import mongoose from "mongoose";
import Prescription from "./Prescription.schema";
import Order from "../order/Order.schema";
import { ApiError, paginate } from "../../shared/utils";

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export class PrescriptionService {
  static async submitForUser(userId: string, payload: any) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user id");
    const { files, note, linkedOrder } = payload || {};
    if (!Array.isArray(files) || files.length === 0) throw new ApiError(400, "files is required");

    const created = await Prescription.create({
      user: userId,
      files,
      note: note || "",
      linkedOrder: linkedOrder || null,
    });

    if (linkedOrder && isValidId(String(linkedOrder))) {
      await Order.findByIdAndUpdate(linkedOrder, { $set: { prescription: created._id } });
    }

    return created;
  }

  static async listForUser(userId: string, query: any) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user id");
    const { skip, limit, page, totalPages } = paginate(query || {});
    const filter: any = { user: userId };
    if (query?.status) filter.status = query.status;
    const [items, total] = await Promise.all([
      Prescription.find(filter).populate("linkedOrder verifiedBy").skip(skip).limit(limit).sort({ createdAt: -1 }),
      Prescription.countDocuments(filter),
    ]);
    return { items, pagination: { total, page, limit, totalPages: totalPages(total) } };
  }

  static async listAll(query: any) {
    const { skip, limit, page, totalPages } = paginate(query || {});
    const filter: any = {};
    if (query?.status) filter.status = query.status;
    if (query?.user && isValidId(String(query.user))) filter.user = query.user;
    const [items, total] = await Promise.all([
      Prescription.find(filter).populate("user linkedOrder verifiedBy").skip(skip).limit(limit).sort({ createdAt: -1 }),
      Prescription.countDocuments(filter),
    ]);
    return { items, pagination: { total, page, limit, totalPages: totalPages(total) } };
  }

  static async get(id: string) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid prescription id");
    const doc = await Prescription.findById(id).populate("user linkedOrder verifiedBy");
    if (!doc) throw new ApiError(404, "Prescription not found");
    return doc;
  }

  static async adminUpdate(id: string, payload: any, verifierUserId: string) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid prescription id");
    if (!isValidId(verifierUserId)) throw new ApiError(400, "Invalid verifier user id");

    const next: any = { ...payload };
    if (payload?.status === "verified" || payload?.status === "rejected") {
      next.verifiedBy = verifierUserId;
      next.verifiedAt = new Date();
    }

    const doc = await Prescription.findByIdAndUpdate(id, next, { new: true });
    if (!doc) throw new ApiError(404, "Prescription not found");
    return doc;
  }
}


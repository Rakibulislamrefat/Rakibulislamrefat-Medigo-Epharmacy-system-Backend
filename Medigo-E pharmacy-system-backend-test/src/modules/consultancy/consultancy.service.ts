import mongoose from "mongoose";
import Consultancy from "./Consultancy.schema";
import { ApiError, paginate } from "../../shared/utils";

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export class ConsultancyService {
  static async createForUser(userId: string, payload: any) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user id");
    const { doctor, mode, scheduledAt, durationMinutes, symptoms, notes, attachments } = payload || {};
    if (!doctor) throw new ApiError(400, "doctor is required");
    if (!isValidId(String(doctor))) throw new ApiError(400, "Invalid doctor id");

    const created = await Consultancy.create({
      user: userId,
      doctor,
      mode: mode || "chat",
      scheduledAt: scheduledAt || null,
      durationMinutes: durationMinutes ?? 15,
      symptoms: symptoms || "",
      notes: notes || "",
      attachments: Array.isArray(attachments) ? attachments : [],
    });
    return created;
  }

  static async listForUser(userId: string, query: any) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user id");
    const { skip, limit, page, totalPages } = paginate(query || {});
    const filter: any = { user: userId };
    if (query?.status) filter.status = query.status;
    const [items, total] = await Promise.all([
      Consultancy.find(filter).populate("doctor transaction").skip(skip).limit(limit).sort({ createdAt: -1 }),
      Consultancy.countDocuments(filter),
    ]);
    return { items, pagination: { total, page, limit, totalPages: totalPages(total) } };
  }

  static async listAll(query: any) {
    const { skip, limit, page, totalPages } = paginate(query || {});
    const filter: any = {};
    if (query?.status) filter.status = query.status;
    if (query?.doctor && isValidId(String(query.doctor))) filter.doctor = query.doctor;
    if (query?.user && isValidId(String(query.user))) filter.user = query.user;
    const [items, total] = await Promise.all([
      Consultancy.find(filter).populate("user doctor transaction").skip(skip).limit(limit).sort({ createdAt: -1 }),
      Consultancy.countDocuments(filter),
    ]);
    return { items, pagination: { total, page, limit, totalPages: totalPages(total) } };
  }

  static async get(id: string) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid consultancy id");
    const doc = await Consultancy.findById(id).populate("user doctor transaction");
    if (!doc) throw new ApiError(404, "Consultancy not found");
    return doc;
  }

  static async update(id: string, payload: any) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid consultancy id");
    const doc = await Consultancy.findByIdAndUpdate(id, payload, { new: true });
    if (!doc) throw new ApiError(404, "Consultancy not found");
    return doc;
  }
}


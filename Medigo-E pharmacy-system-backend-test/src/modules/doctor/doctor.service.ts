import mongoose from "mongoose";
import Doctor from "./Doctor.schema";
import { ApiError, paginate } from "../../shared/utils";

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export class DoctorService {
  static async create(payload: any) {
    const { user, fullName } = payload || {};
    if (!user) throw new ApiError(400, "user is required");
    if (!fullName) throw new ApiError(400, "fullName is required");
    const created = await Doctor.create(payload);
    return created;
  }

  static async list(query: any) {
    const { skip, limit, page, totalPages } = paginate(query || {});
    const filter: any = {};
    if (query?.status) filter.status = query.status;
    if (query?.specialization) {
      filter.specialization = new RegExp(String(query.specialization), "i");
    }
    if (query?.q) {
      filter.$or = [
        { fullName: new RegExp(String(query.q), "i") },
        { specialization: new RegExp(String(query.q), "i") },
        { registrationNumber: new RegExp(String(query.q), "i") },
      ];
    }
    const [items, total] = await Promise.all([
      Doctor.find(filter).populate("user").skip(skip).limit(limit).sort({ createdAt: -1 }),
      Doctor.countDocuments(filter),
    ]);
    return { items, pagination: { total, page, limit, totalPages: totalPages(total) } };
  }

  static async get(id: string) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid doctor id");
    const doc = await Doctor.findById(id).populate("user");
    if (!doc) throw new ApiError(404, "Doctor not found");
    return doc;
  }

  static async update(id: string, payload: any) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid doctor id");
    const doc = await Doctor.findByIdAndUpdate(id, payload, { new: true });
    if (!doc) throw new ApiError(404, "Doctor not found");
    return doc;
  }

  static async remove(id: string) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid doctor id");
    const doc = await Doctor.findByIdAndDelete(id);
    if (!doc) throw new ApiError(404, "Doctor not found");
    return doc;
  }
}


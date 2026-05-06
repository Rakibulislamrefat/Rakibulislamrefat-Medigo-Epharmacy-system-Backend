import mongoose from "mongoose";
import Branch from "./Branch.schema";
import { ApiError, paginate } from "../../shared/utils";

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export class BranchService {
  static async create(payload: any) {
    const { name } = payload || {};
    if (!name) throw new ApiError(400, "name is required");
    const created = await Branch.create(payload);
    return created;
  }

  static async list(query: any) {
    const { skip, limit, page, totalPages } = paginate(query || {});
    const filter: any = {};
    if (query?.active != null) filter.active = query.active === true || query.active === "true";
    if (query?.city) filter.city = new RegExp(String(query.city), "i");
    const [items, total] = await Promise.all([
      Branch.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Branch.countDocuments(filter),
    ]);
    return { items, pagination: { total, page, limit, totalPages: totalPages(total) } };
  }

  static async update(id: string, payload: any) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid branch id");
    const doc = await Branch.findByIdAndUpdate(id, payload, { new: true });
    if (!doc) throw new ApiError(404, "Branch not found");
    return doc;
  }

  static async remove(id: string) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid branch id");
    const doc = await Branch.findByIdAndDelete(id);
    if (!doc) throw new ApiError(404, "Branch not found");
    return doc;
  }
}


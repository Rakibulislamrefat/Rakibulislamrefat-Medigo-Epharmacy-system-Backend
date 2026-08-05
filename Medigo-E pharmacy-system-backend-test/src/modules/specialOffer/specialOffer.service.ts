import mongoose from "mongoose";
import SpecialOffer from "./SpecialOffer.schema";
import { ApiError, paginate } from "../../shared/utils";

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export class SpecialOfferService {
  static async create(payload: any) {
    const { title, discount, code } = payload || {};
    if (!title) throw new ApiError(400, "title is required");
    if (!discount) throw new ApiError(400, "discount is required");
    if (!code) throw new ApiError(400, "code is required");
    const created = await SpecialOffer.create({
      ...payload,
      code: String(code).toUpperCase(),
    });
    return created;
  }

  static async list(query: any) {
    const { skip, limit, page, totalPages } = paginate(query || {});
    const filter: any = {};
    if (query?.active != null) filter.active = query.active === true || query.active === "true";
    if (query?.code) filter.code = String(query.code).toUpperCase();

    const [items, total] = await Promise.all([
      SpecialOffer.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      SpecialOffer.countDocuments(filter),
    ]);

    return { items, pagination: { total, page, limit, totalPages: totalPages(total) } };
  }

  static async getById(id: string) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid offer id");
    const doc = await SpecialOffer.findById(id);
    if (!doc) throw new ApiError(404, "Special offer not found");
    return doc;
  }

  static async update(id: string, payload: any) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid offer id");
    const update = {
      ...payload,
      ...(payload.code ? { code: String(payload.code).toUpperCase() } : {}),
    };
    const doc = await SpecialOffer.findByIdAndUpdate(id, update, { new: true });
    if (!doc) throw new ApiError(404, "Special offer not found");
    return doc;
  }

  static async remove(id: string) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid offer id");
    const doc = await SpecialOffer.findByIdAndDelete(id);
    if (!doc) throw new ApiError(404, "Special offer not found");
    return doc;
  }
}

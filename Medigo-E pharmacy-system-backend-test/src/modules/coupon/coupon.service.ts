import mongoose from "mongoose";
import Coupon from "./Coupon.schema";
import { ApiError, paginate } from "../../shared/utils";

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export class CouponService {
  static async create(payload: any) {
    const { code, type, value } = payload || {};
    if (!code) throw new ApiError(400, "code is required");
    if (!type) throw new ApiError(400, "type is required");
    if (typeof value !== "number") throw new ApiError(400, "value is required");
    const created = await Coupon.create(payload);
    return created;
  }

  static async list(query: any) {
    const { skip, limit, page, totalPages } = paginate(query || {});
    const filter: any = {};
    if (query?.active != null) filter.active = query.active === true || query.active === "true";
    const [items, total] = await Promise.all([
      Coupon.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Coupon.countDocuments(filter),
    ]);
    return { items, pagination: { total, page, limit, totalPages: totalPages(total) } };
  }

  static async update(id: string, payload: any) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid coupon id");
    const doc = await Coupon.findByIdAndUpdate(id, payload, { new: true });
    if (!doc) throw new ApiError(404, "Coupon not found");
    return doc;
  }

  static async remove(id: string) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid coupon id");
    const doc = await Coupon.findByIdAndDelete(id);
    if (!doc) throw new ApiError(404, "Coupon not found");
    return doc;
  }

  static async validate(code: string, subtotal: number) {
    if (!code) throw new ApiError(400, "code is required");
    const coupon: any = await Coupon.findOne({ code: code.toUpperCase(), active: true });
    if (!coupon) throw new ApiError(404, "Coupon not found");
    const now = new Date();
    if (coupon.startAt && now < coupon.startAt) throw new ApiError(400, "Coupon not active yet");
    if (coupon.endAt && now > coupon.endAt) throw new ApiError(400, "Coupon expired");
    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
      throw new ApiError(400, "Coupon usage limit reached");
    }
    if (subtotal < coupon.minOrder) throw new ApiError(400, "Order does not meet minimum amount");

    let discount = 0;
    if (coupon.type === "percentage") {
      discount = (subtotal * Number(coupon.value)) / 100;
      if (coupon.maxDiscount != null) discount = Math.min(discount, Number(coupon.maxDiscount));
    } else {
      discount = Number(coupon.value);
    }
    discount = Math.max(Math.min(discount, subtotal), 0);
    return { coupon, discount };
  }
}


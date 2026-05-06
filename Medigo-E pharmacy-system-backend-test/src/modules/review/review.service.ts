import mongoose from "mongoose";
import Review from "./Review.schema";
import Product from "../product/Product.schema";
import { ApiError, paginate } from "../../shared/utils";

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export class ReviewService {
  static async createForUser(userId: string, payload: any) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user id");
    const product = payload?.product || payload?.medicine;
    const rating = payload?.rating;
    const comment = payload?.comment;
    const order = payload?.order ?? null;

    if (!product) throw new ApiError(400, "product is required");
    if (!isValidId(String(product))) throw new ApiError(400, "Invalid product id");
    if (typeof rating !== "number") throw new ApiError(400, "rating is required");

    const p: any = await Product.findById(product).select("_id status");
    if (!p || p.status !== "active") throw new ApiError(404, "Product not found");

    try {
      const created = await Review.create({
        user: userId,
        product,
        order,
        rating,
        comment: comment || "",
      });
      return created;
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new ApiError(400, "You already reviewed this product");
      }
      throw err;
    }
  }

  static async list(query: any) {
    const { skip, limit, page, totalPages } = paginate(query || {});
    const filter: any = {};
    if (query?.product && isValidId(String(query.product))) filter.product = query.product;
    if (query?.user && isValidId(String(query.user))) filter.user = query.user;
    const [items, total] = await Promise.all([
      Review.find(filter).populate("user product order").skip(skip).limit(limit).sort({ createdAt: -1 }),
      Review.countDocuments(filter),
    ]);
    return { items, pagination: { total, page, limit, totalPages: totalPages(total) } };
  }

  static async listForUser(userId: string, query: any) {
    return this.list({ ...query, user: userId });
  }

  static async remove(id: string) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid review id");
    const removed = await Review.findByIdAndDelete(id);
    if (!removed) throw new ApiError(404, "Review not found");
    return removed;
  }

  static async get(id: string) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid review id");
    const doc = await Review.findById(id).populate("user product order");
    if (!doc) throw new ApiError(404, "Review not found");
    return doc;
  }
}


import mongoose from "mongoose";
import Product from "./Product.schema";
import { ApiError, paginate } from "../../shared/utils";

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export class ProductService {
  static async create(payload: any) {
    const { name, slug, price } = payload || {};
    if (!name) throw new ApiError(400, "name is required");
    if (!slug) throw new ApiError(400, "slug is required");
    if (typeof price !== "number") throw new ApiError(400, "price is required");
    const created = await Product.create(payload);
    return created;
  }

  static async list(query: any) {
    const { skip, limit, page, totalPages } = paginate(query || {});

    const filter: Record<string, any> = {};
    if (query?.status) filter.status = query.status;
    if (query?.category) filter.categories = query.category;
    if (query?.requiresPrescription != null) {
      filter.requiresPrescription =
        query.requiresPrescription === true || query.requiresPrescription === "true";
    }
    if (query?.q) {
      filter.$text = { $search: String(query.q) };
    }

    const sort = query?.q
      ? ({ score: { $meta: "textScore" }, createdAt: -1 } as any)
      : ({ createdAt: -1 } as any);
    const projection = query?.q ? ({ score: { $meta: "textScore" } } as any) : undefined;

    const [items, total] = await Promise.all([
      Product.find(filter, projection).skip(skip).limit(limit).sort(sort),
      Product.countDocuments(filter),
    ]);

    return {
      items,
      pagination: { total, page, limit, totalPages: totalPages(total) },
    };
  }

  static async getByIdOrSlug(idOrSlug: string) {
    const doc = isValidId(idOrSlug)
      ? await Product.findById(idOrSlug)
      : await Product.findOne({ slug: String(idOrSlug).toLowerCase() });
    if (!doc) throw new ApiError(404, "Product not found");
    return doc;
  }

  static async update(id: string, payload: any) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid product id");
    const updated = await Product.findByIdAndUpdate(id, payload, { new: true });
    if (!updated) throw new ApiError(404, "Product not found");
    return updated;
  }

  static async remove(id: string) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid product id");
    const removed = await Product.findByIdAndDelete(id);
    if (!removed) throw new ApiError(404, "Product not found");
    return removed;
  }

  static async getMedicinesByCategory(query: any = {}) {
    const pipeline: any[] = [];

    // 1. Initial Match: Filter products that contain AT LEAST ONE of the requested categories
    if (query?.categories) {
      const categoriesArray = Array.isArray(query.categories) 
        ? query.categories 
        : query.categories.split(',').map((c: string) => c.trim());
      pipeline.push({ $match: { categories: { $in: categoriesArray } } });
    }

    // 2. Unwind the categories array so each product becomes multiple documents, one per category
    pipeline.push({ $unwind: "$categories" });

    // 3. Second Match: Filter again to remove the unwound categories that weren't requested
    if (query?.categories) {
      const categoriesArray = Array.isArray(query.categories) 
        ? query.categories 
        : query.categories.split(',').map((c: string) => c.trim());
      pipeline.push({ $match: { categories: { $in: categoriesArray } } });
    }

    // 4. Group by category and push the original document
    pipeline.push({
      $group: {
        _id: "$categories",
        medicines: { $push: "$$ROOT" }
      }
    });

    // 5. Format output and sort
    pipeline.push(
      {
        $project: {
          category: "$_id",
          medicines: 1,
          _id: 0
        }
      },
      { $sort: { category: 1 } }
    );

    const result = await Product.aggregate(pipeline);
    return result;
  }
}


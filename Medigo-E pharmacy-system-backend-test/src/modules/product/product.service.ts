import mongoose from "mongoose";
import Product from "./Product.schema";
import { ApiError, paginate } from "../../shared/utils";
import { deleteFromCloudinary, getPublicIdFromUrl } from "../../middleware/upload.middleware";

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

const slugify = (value: string) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const toNumber = (value: unknown, fallback?: number | null) => {
  if (value === "" || value == null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
};

const toBoolean = (value: unknown) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return value;
};

const toStringArray = (value: unknown) => {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value !== "string") return value;

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map(String).map((item) => item.trim()).filter(Boolean);
    }
  } catch {
    // Fall back to comma-separated form data values.
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const normalizeProductPayload = (payload: any = {}) => {
  const normalized = { ...payload };

  delete normalized.image;

  if (!normalized.slug && normalized.name) normalized.slug = slugify(normalized.name);
  if (normalized.slug) normalized.slug = slugify(normalized.slug);

  if ("price" in normalized) normalized.price = toNumber(normalized.price);
  if ("salePrice" in normalized) normalized.salePrice = toNumber(normalized.salePrice, null);
  if ("stockQty" in normalized) normalized.stockQty = toNumber(normalized.stockQty);
  if ("otc" in normalized) normalized.otc = toBoolean(normalized.otc);
  if ("requiresPrescription" in normalized) {
    normalized.requiresPrescription = toBoolean(normalized.requiresPrescription);
  }

  for (const field of ["categories", "tags", "indications", "warnings"]) {
    if (normalized[field] != null) normalized[field] = toStringArray(normalized[field]);
  }

  return normalized;
};

export class ProductService {
  static async create(payload: any) {
    payload = normalizeProductPayload(payload);
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
    payload = normalizeProductPayload(payload);

    // If new images are provided, delete old ones
    if (payload.images && payload.images.length > 0) {
      const existingProduct = await Product.findById(id);
      if (existingProduct && existingProduct.images && existingProduct.images.length > 0) {
        for (const imageUrl of existingProduct.images) {
          try {
            const publicId = getPublicIdFromUrl(imageUrl);
            await deleteFromCloudinary(publicId);
          } catch (error) {
            console.error(`Failed to delete old image ${imageUrl} from Cloudinary:`, error);
          }
        }
      }
    }

    const updated = await Product.findByIdAndUpdate(id, payload, { new: true });
    if (!updated) throw new ApiError(404, "Product not found");
    return updated;
  }

  static async remove(id: string) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid product id");

    // Get the product to access images
    const product = await Product.findById(id);
    if (!product) throw new ApiError(404, "Product not found");

    // Delete images from Cloudinary
    if (product.images && product.images.length > 0) {
      for (const imageUrl of product.images) {
        try {
          const publicId = getPublicIdFromUrl(imageUrl);
          await deleteFromCloudinary(publicId);
        } catch (error) {
          console.error(`Failed to delete image ${imageUrl} from Cloudinary:`, error);
          // Continue with product deletion even if image deletion fails
        }
      }
    }

    const removed = await Product.findByIdAndDelete(id);
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

import mongoose from "mongoose";
import Product from "../product/Product.schema";
import User from "../user/User.schema";
import PrescriptionOrder from "./prescriptionOrder.schema";
import { ApiError, paginate } from "../../shared/utils";

const PRESCRIPTION_ORDER_STATUSES = ["pending", "confirmed", "processing", "delivered", "cancelled"];
const PRESCRIPTION_ORDER_FIELDS = ["prescriptionFile", "user", "address", "medicines", "notes", "status"];

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

const normalizePayload = (payload: any = {}, partial = false) => {
  const normalized: Record<string, any> = {};

  for (const field of PRESCRIPTION_ORDER_FIELDS) {
    if (payload[field] !== undefined) normalized[field] = payload[field];
  }

  for (const field of ["prescriptionFile", "notes", "status"]) {
    if (typeof normalized[field] === "string") normalized[field] = normalized[field].trim();
  }

  if (normalized.medicines === undefined) {
    if (!partial) normalized.medicines = [];
  } else if (!Array.isArray(normalized.medicines)) {
    throw new ApiError(400, "medicines must be an array");
  }

  if (!partial) {
    for (const field of ["prescriptionFile", "user", "address"]) {
      if (!normalized[field]) throw new ApiError(400, `${field} is required`);
    }
  }

  if (normalized.user?.userId && !isValidId(String(normalized.user.userId))) {
    throw new ApiError(400, "Invalid user id");
  }

  if (normalized.address) {
    for (const field of ["line1", "city", "country"]) {
      if (!String(normalized.address[field] || "").trim()) throw new ApiError(400, `${field} is required`);
    }
  }

  if (normalized.status && !PRESCRIPTION_ORDER_STATUSES.includes(normalized.status)) {
    throw new ApiError(400, "Invalid prescription order status");
  }

  return normalized;
};

const populatePrescriptionOrder = (query: any) => query;

const buildUserSnapshot = async (userId: string) => {
  if (!isValidId(userId)) throw new ApiError(400, "Invalid user id");

  const user: any = await User.findById(userId).select("name email phone");
  if (!user) throw new ApiError(404, "User not found");

  return {
    userId: user._id,
    name: user.name,
    email: user.email || "",
    phone: user.phone || "",
  };
};

const getQuantity = (quantities: any, medicineId: string, index: number) => {
  if (Array.isArray(quantities)) return Math.max(Number(quantities[index]) || 1, 1);
  if (quantities && typeof quantities === "object") return Math.max(Number(quantities[medicineId]) || 1, 1);
  return 1;
};

const buildMedicineSnapshots = async (medicineIds: string[] = [], quantities: any = {}) => {
  if (medicineIds.length === 0) return [];

  const uniqueIds = Array.from(new Set(medicineIds.map(String)));
  for (const medicineId of uniqueIds) {
    if (!isValidId(medicineId)) throw new ApiError(400, "Invalid medicine id");
  }

  const products: any[] = await Product.find({ _id: { $in: uniqueIds } }).select(
    "name genericName brandName price salePrice images requiresPrescription status",
  );

  if (products.length !== uniqueIds.length) throw new ApiError(400, "One or more medicines not found");

  const productMap = new Map(products.map((product) => [String(product._id), product]));

  return uniqueIds.map((medicineId, index) => {
    const product = productMap.get(medicineId);
    return {
      medicineId: product._id,
      name: product.name,
      genericName: product.genericName || "",
      brandName: product.brandName || "",
      quantity: getQuantity(quantities, medicineId, index),
      price: product.price || 0,
      salePrice: product.salePrice ?? null,
      images: product.images || [],
      requiresPrescription: Boolean(product.requiresPrescription),
      status: product.status || "active",
    };
  });
};

export class PrescriptionOrderService {
  static async createForUser(userId: string, payload: any) {
    const user = await buildUserSnapshot(userId);
    const medicines = await buildMedicineSnapshots(payload?.medicines || [], payload?.quantities || {});
    const normalized = normalizePayload({ ...payload, user, medicines });

    const created = await PrescriptionOrder.create(normalized);
    return populatePrescriptionOrder(PrescriptionOrder.findById(created._id));
  }

  static async listForUser(userId: string, query: any = {}) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user id");

    const { skip, limit, page, totalPages } = paginate({ ...query, limit: query?.rows || query?.limit });
    const filter: any = { "user.userId": userId };
    if (query?.status && String(query.status).toLowerCase() !== "all") filter.status = query.status;

    const [items, total] = await Promise.all([
      populatePrescriptionOrder(PrescriptionOrder.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 })),
      PrescriptionOrder.countDocuments(filter),
    ]);

    return { items, pagination: { total, page, limit, totalPages: totalPages(total) } };
  }

  static async listAll(query: any = {}) {
    const { skip, limit, page, totalPages } = paginate({ ...query, limit: query?.rows || query?.limit });
    const filter: any = {};

    if (query?.status && String(query.status).toLowerCase() !== "all") filter.status = query.status;
    if (query?.user && isValidId(String(query.user))) filter["user.userId"] = query.user;

    const [items, total] = await Promise.all([
      populatePrescriptionOrder(PrescriptionOrder.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 })),
      PrescriptionOrder.countDocuments(filter),
    ]);

    return { items, pagination: { total, page, limit, totalPages: totalPages(total) } };
  }

  static async getForUser(userId: string, id: string) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user id");
    if (!isValidId(id)) throw new ApiError(400, "Invalid prescription order id");

    const doc = await populatePrescriptionOrder(PrescriptionOrder.findOne({ _id: id, "user.userId": userId }));
    if (!doc) throw new ApiError(404, "Prescription order not found");
    return doc;
  }

  static async getById(id: string) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid prescription order id");

    const doc = await populatePrescriptionOrder(PrescriptionOrder.findById(id));
    if (!doc) throw new ApiError(404, "Prescription order not found");
    return doc;
  }

  static async update(id: string, payload: any) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid prescription order id");

    const normalized = normalizePayload(payload, true);
    if (payload?.medicines !== undefined) {
      normalized.medicines = await buildMedicineSnapshots(payload.medicines, payload?.quantities || {});
    }

    const doc = await populatePrescriptionOrder(
      PrescriptionOrder.findByIdAndUpdate(id, normalized, { new: true, runValidators: true }),
    );

    if (!doc) throw new ApiError(404, "Prescription order not found");
    return doc;
  }

  static async remove(id: string) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid prescription order id");

    const doc = await PrescriptionOrder.findByIdAndDelete(id);
    if (!doc) throw new ApiError(404, "Prescription order not found");
    return doc;
  }
}

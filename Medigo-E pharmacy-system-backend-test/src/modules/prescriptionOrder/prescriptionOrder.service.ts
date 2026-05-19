import mongoose from "mongoose";
import Address from "../address/address.schema";
import Product from "../product/Product.schema";
import PrescriptionOrder from "./prescriptionOrder.schema";
import { ApiError, paginate } from "../../shared/utils";

const PRESCRIPTION_ORDER_STATUSES = ["pending", "confirmed", "processing", "delivered", "cancelled"];
const PRESCRIPTION_ORDER_FIELDS = ["prescriptionFile", "user", "address", "medicines", "status"];

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

const normalizePayload = (payload: any = {}, partial = false) => {
  const normalized: Record<string, any> = {};

  for (const field of PRESCRIPTION_ORDER_FIELDS) {
    if (payload[field] !== undefined) normalized[field] = payload[field];
  }

  for (const field of ["prescriptionFile", "user", "address", "status"]) {
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

  if (normalized.user && !isValidId(String(normalized.user))) {
    throw new ApiError(400, "Invalid user id");
  }

  if (normalized.address && !isValidId(String(normalized.address))) {
    throw new ApiError(400, "Invalid address id");
  }

  if (normalized.medicines) {
    for (const medicineId of normalized.medicines) {
      if (!isValidId(String(medicineId))) throw new ApiError(400, "Invalid medicine id");
    }
  }

  if (normalized.status && !PRESCRIPTION_ORDER_STATUSES.includes(normalized.status)) {
    throw new ApiError(400, "Invalid prescription order status");
  }

  return normalized;
};

const populatePrescriptionOrder = (query: any) =>
  query.populate("user", "name email phone role").populate("medicines", "name price salePrice images requiresPrescription status");

const ensureAddressBelongsToUser = async (userId: string, addressId: string) => {
  const addressBook: any = await Address.findOne({ user: userId, "addresses._id": addressId }).select("_id addresses.$");
  if (!addressBook) throw new ApiError(404, "Address not found for this user");
};

const ensureMedicinesExist = async (medicineIds: string[] = []) => {
  if (medicineIds.length === 0) return;

  const uniqueIds = Array.from(new Set(medicineIds.map(String)));
  const foundCount = await Product.countDocuments({ _id: { $in: uniqueIds } });
  if (foundCount !== uniqueIds.length) throw new ApiError(400, "One or more medicines not found");
};

export class PrescriptionOrderService {
  static async createForUser(userId: string, payload: any) {
    const normalized = normalizePayload({ ...payload, user: userId });

    await ensureAddressBelongsToUser(String(normalized.user), String(normalized.address));
    await ensureMedicinesExist(normalized.medicines);

    const created = await PrescriptionOrder.create(normalized);
    return populatePrescriptionOrder(PrescriptionOrder.findById(created._id));
  }

  static async listForUser(userId: string, query: any = {}) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user id");

    const { skip, limit, page, totalPages } = paginate({ ...query, limit: query?.rows || query?.limit });
    const filter: any = { user: userId };
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
    if (query?.user && isValidId(String(query.user))) filter.user = query.user;

    const [items, total] = await Promise.all([
      populatePrescriptionOrder(PrescriptionOrder.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 })),
      PrescriptionOrder.countDocuments(filter),
    ]);

    return { items, pagination: { total, page, limit, totalPages: totalPages(total) } };
  }

  static async getForUser(userId: string, id: string) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user id");
    if (!isValidId(id)) throw new ApiError(400, "Invalid prescription order id");

    const doc = await populatePrescriptionOrder(PrescriptionOrder.findOne({ _id: id, user: userId }));
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
    if (normalized.medicines) await ensureMedicinesExist(normalized.medicines);

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

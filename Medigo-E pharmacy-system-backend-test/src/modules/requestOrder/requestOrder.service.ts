import mongoose from "mongoose";
import RequestOrder from "./requestOrder.schema";
import { ApiError, paginate } from "../../shared/utils";

const REQUEST_ORDER_STATUSES = ["pending", "confirmed", "cancelled"];
const REQUEST_ORDER_FIELDS = [
  "fullName",
  "phone",
  "email",
  "deliveryAddress",
  "city",
  "country",
  "deliveryNotes",
  "items",
  "status",
  "meta",
  "paymentMethod",
  "paymentStatus",
  "totalAmount",
  "pharmacistNotes",
  "transactionId",
];

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseItems = (value: unknown) => {
  if (Array.isArray(value)) return value;
  if (value == null || value === "") return [];
  if (typeof value !== "string") return value;

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    throw new ApiError(400, "items must be a valid JSON array");
  }

  throw new ApiError(400, "items must be an array");
};

const normalizeRequestOrderPayload = (payload: any = {}, partial = false) => {
  const normalized: Record<string, any> = {};

  for (const field of REQUEST_ORDER_FIELDS) {
    if (payload[field] !== undefined) normalized[field] = payload[field];
  }

  for (const field of [
    "fullName",
    "phone",
    "email",
    "deliveryAddress",
    "city",
    "country",
    "deliveryNotes",
    "status",
  ]) {
    if (typeof normalized[field] === "string") normalized[field] = normalized[field].trim();
  }

  if (normalized.email) normalized.email = normalized.email.toLowerCase();
  if (normalized.items !== undefined) normalized.items = parseItems(normalized.items);

  if (!partial) {
    for (const field of ["fullName", "phone", "email", "deliveryAddress", "city", "country"]) {
      if (!normalized[field]) throw new ApiError(400, `${field} is required`);
    }
  }

  if (normalized.status && !REQUEST_ORDER_STATUSES.includes(normalized.status)) {
    throw new ApiError(400, "status must be pending, confirmed, or cancelled");
  }

  return normalized;
};

export class RequestOrderService {
  static async create(payload: any) {
    return RequestOrder.create(normalizeRequestOrderPayload(payload));
  }

  static async list(query: any) {
    const paginationQuery = { ...(query || {}), limit: query?.rows || query?.limit };
    const { skip, limit, page, totalPages } = paginate(paginationQuery);
    const filter: any = {};

    if (query?.status && String(query.status).toLowerCase() !== "all") filter.status = query.status;
    if (query?.city) filter.city = new RegExp(escapeRegex(String(query.city).trim()), "i");

    const search = query?.q || query?.search;
    if (search) {
      const regex = new RegExp(escapeRegex(String(search).trim()), "i");
      filter.$or = [
        { fullName: regex },
        { phone: regex },
        { email: regex },
        { deliveryAddress: regex },
        { city: regex },
      ];
    }

    const [items, total] = await Promise.all([
      RequestOrder.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      RequestOrder.countDocuments(filter),
    ]);

    return { items, pagination: { total, page, limit, totalPages: totalPages(total) } };
  }

  static async listForUser(query: any) {
    return this.list(query);
  }

  static async get(id: string) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid request order id");
    const doc = await RequestOrder.findById(id);
    if (!doc) throw new ApiError(404, "Request order not found");
    return doc;
  }

  static async update(id: string, payload: any) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid request order id");
    const doc = await RequestOrder.findByIdAndUpdate(
      id,
      normalizeRequestOrderPayload(payload, true),
      { new: true, runValidators: true }
    );
    if (!doc) throw new ApiError(404, "Request order not found");
    return doc;
  }

  static async remove(id: string) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid request order id");
    const doc = await RequestOrder.findByIdAndDelete(id);
    if (!doc) throw new ApiError(404, "Request order not found");
    return doc;
  }

  static async updatePayment(id: string, payload: any) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid request order id");
    
    const doc = await RequestOrder.findById(id);
    if (!doc) throw new ApiError(404, "Request order not found");

    const { method, paymentMethod, orderId, status, pharmacistNotes, customerInfo, items, totalAmount } = payload;

    // Validate payment method
    if (method && !["online", "cash_on_delivery"].includes(method)) {
      throw new ApiError(400, "Invalid payment method. Must be 'online' or 'cash_on_delivery'");
    }

    if (paymentMethod && !["sslcommerz", "cod"].includes(paymentMethod)) {
      throw new ApiError(400, "Invalid paymentMethod. Must be 'sslcommerz' or 'cod'");
    }

    // Validate required payment fields
    if (!totalAmount || totalAmount <= 0) {
      throw new ApiError(400, "totalAmount is required and must be greater than 0");
    }

    // Update document with payment information
    const updateData: any = {
      paymentMethod: paymentMethod || method === "online" ? "sslcommerz" : "cod",
      totalAmount,
      paymentStatus: "pending",
    };

    if (status) updateData.status = status;
    if (pharmacistNotes) updateData.pharmacistNotes = pharmacistNotes;
    if (items) updateData.items = parseItems(items);

    const updatedDoc = await RequestOrder.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    return updatedDoc;
  }

  static async initiateSSLCommerzPayment(id: string, payload: any) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid request order id");
    
    const doc = await RequestOrder.findById(id);
    if (!doc) throw new ApiError(404, "Request order not found");

    const { paymentMethod, totalAmount, customerInfo } = payload;

    if (paymentMethod !== "sslcommerz") {
      throw new ApiError(400, "Payment method must be sslcommerz for this endpoint");
    }

    if (!totalAmount || totalAmount <= 0) {
      throw new ApiError(400, "Valid totalAmount is required");
    }

    if (!customerInfo?.email || !customerInfo?.phone) {
      throw new ApiError(400, "Customer email and phone are required");
    }

    // SSLCommerz integration would be done in the controller/routes
    // This service method validates and prepares the data
    return {
      orderId: id,
      amount: totalAmount,
      customer: {
        name: customerInfo.name || doc.fullName,
        email: customerInfo.email,
        phone: customerInfo.phone,
      },
      ready: true,
    };
  }
}

import mongoose from "mongoose";
import PaymentTransaction from "./PaymentTransaction.schema";
import Order from "../order/Order.schema";
import { ApiError, paginate } from "../../shared/utils";

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export class PaymentTransactionService {
  static async createForUser(userId: string, payload: any) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user id");
    const { order, provider, reference, raw } = payload || {};
    if (!order) throw new ApiError(400, "order is required");
    if (!isValidId(String(order))) throw new ApiError(400, "Invalid order id");

    const o: any = await Order.findById(order).select("user grandTotal");
    if (!o) throw new ApiError(404, "Order not found");
    if (String(o.user) !== String(userId)) throw new ApiError(403, "Access denied");

    const created = await PaymentTransaction.create({
      order,
      user: userId,
      provider: provider || "manual",
      amount: Number(o.grandTotal || 0),
      currency: "BDT",
      status: "initiated",
      reference: reference || "",
      raw: raw || {},
    });

    return created;
  }

  static async listForUser(userId: string, query: any) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user id");
    const { skip, limit, page, totalPages } = paginate(query || {});
    const filter: any = { user: userId };
    if (query?.status) filter.status = query.status;
    const [items, total] = await Promise.all([
      PaymentTransaction.find(filter).populate("order").skip(skip).limit(limit).sort({ createdAt: -1 }),
      PaymentTransaction.countDocuments(filter),
    ]);
    return { items, pagination: { total, page, limit, totalPages: totalPages(total) } };
  }

  static async listAll(query: any) {
    const { skip, limit, page, totalPages } = paginate(query || {});
    const filter: any = {};
    if (query?.status) filter.status = query.status;
    if (query?.order && isValidId(String(query.order))) filter.order = query.order;
    if (query?.user && isValidId(String(query.user))) filter.user = query.user;
    const [items, total] = await Promise.all([
      PaymentTransaction.find(filter).populate("order user").skip(skip).limit(limit).sort({ createdAt: -1 }),
      PaymentTransaction.countDocuments(filter),
    ]);
    return { items, pagination: { total, page, limit, totalPages: totalPages(total) } };
  }

  static async get(id: string) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid payment transaction id");
    const doc = await PaymentTransaction.findById(id).populate("order user");
    if (!doc) throw new ApiError(404, "Payment transaction not found");
    return doc;
  }

  static async update(id: string, payload: any) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid payment transaction id");
    const doc = await PaymentTransaction.findByIdAndUpdate(id, payload, { new: true });
    if (!doc) throw new ApiError(404, "Payment transaction not found");
    return doc;
  }
}


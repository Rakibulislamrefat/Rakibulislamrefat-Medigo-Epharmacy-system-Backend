import mongoose from "mongoose";
import Order from "./Order.schema";
import Product from "../product/Product.schema";
import Coupon from "../coupon/Coupon.schema";
import Cart from "../cart/Cart.schema";
import { ApiError, paginate } from "../../shared/utils";

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

const generateOrderNumber = () => {
  const d = new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const rand = Math.random().toString(16).slice(2, 8).toUpperCase();
  return `MDG-${yyyy}${mm}${dd}-${rand}`;
};

const computeCouponDiscount = async (couponId: string, subtotal: number) => {
  if (!couponId) return 0;
  if (!isValidId(couponId)) throw new ApiError(400, "Invalid coupon id");
  const coupon: any = await Coupon.findById(couponId);
  if (!coupon || !coupon.active) throw new ApiError(404, "Coupon not found");
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
  return discount;
};

export class OrderService {
  static async createForUser(userId: string, payload: any) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user id");
    const { items, deliveryFee, contactName, contactPhone, deliveryAddress, notes, appliedCoupon, prescription, paymentStatus, status } =
      payload || {};

    if (!Array.isArray(items) || items.length === 0) throw new ApiError(400, "items is required");

    const normalizedItems = items.map((it: any) => ({
      product: it.product || it.medicine,
      qty: Number(it.qty),
    }));

    for (const it of normalizedItems) {
      if (!it.product) throw new ApiError(400, "product is required in items");
      if (!Number.isFinite(it.qty) || it.qty < 1) throw new ApiError(400, "qty must be >= 1");
      if (!isValidId(String(it.product))) throw new ApiError(400, "Invalid product id in items");
    }

    const productIds = normalizedItems.map((i) => new mongoose.Types.ObjectId(i.product));
    const products = await Product.find({ _id: { $in: productIds }, status: "active" }).select(
      "name price salePrice stockQty requiresPrescription currency",
    );
    if (products.length !== productIds.length) throw new ApiError(400, "One or more products not found");

    const productMap = new Map<string, any>(products.map((p: any) => [String(p._id), p]));

    const orderItems = normalizedItems.map((it) => {
      const p = productMap.get(String(it.product));
      const unitPrice = p.salePrice != null ? Number(p.salePrice) : Number(p.price);
      const lineTotal = unitPrice * it.qty;
      return {
        product: p._id,
        nameSnapshot: p.name,
        unitPrice,
        qty: it.qty,
        lineTotal,
      };
    });

    for (const it of orderItems) {
      const p = productMap.get(String(it.product));
      if (Number(p.stockQty) < Number(it.qty)) {
        throw new ApiError(400, `Insufficient stock for ${p.name}`);
      }
    }

    const subtotal = orderItems.reduce((sum: number, it: any) => sum + Number(it.lineTotal), 0);
    const delivery = Number(deliveryFee || 0);
    const discount = appliedCoupon ? await computeCouponDiscount(String(appliedCoupon), subtotal) : 0;
    const grandTotal = Math.max(subtotal + delivery - discount, 0);
    const prescriptionRequired = products.some((p: any) => Boolean(p.requiresPrescription));

    const created = await Order.create({
      orderNumber: generateOrderNumber(),
      user: userId,
      items: orderItems,
      status: status || "pending",
      paymentStatus: paymentStatus || "unpaid",
      subtotal,
      discountTotal: discount,
      deliveryFee: delivery,
      grandTotal,
      contactName: contactName || "",
      contactPhone: contactPhone || "",
      deliveryAddress: deliveryAddress || {},
      notes: notes || "",
      prescriptionRequired,
      prescription: prescription || null,
      appliedCoupon: appliedCoupon || null,
    });

    await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } });

    return created;
  }

  static async listForUser(userId: string, query: any) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user id");
    const { skip, limit, page, totalPages } = paginate(query || {});
    const filter: any = { user: userId };
    const [items, total] = await Promise.all([
      Order.find(filter).populate("items.product appliedCoupon prescription").skip(skip).limit(limit).sort({ createdAt: -1 }),
      Order.countDocuments(filter),
    ]);
    return { items, pagination: { total, page, limit, totalPages: totalPages(total) } };
  }

  static async listAll(query: any) {
    const { skip, limit, page, totalPages } = paginate(query || {});
    const filter: any = {};
    if (query?.status) filter.status = query.status;
    if (query?.paymentStatus) filter.paymentStatus = query.paymentStatus;
    if (query?.user && isValidId(String(query.user))) filter.user = query.user;
    const [items, total] = await Promise.all([
      Order.find(filter).populate("items.product user appliedCoupon prescription").skip(skip).limit(limit).sort({ createdAt: -1 }),
      Order.countDocuments(filter),
    ]);
    return { items, pagination: { total, page, limit, totalPages: totalPages(total) } };
  }

  static async getByIdOrNumber(idOrNumber: string) {
    const doc = isValidId(idOrNumber)
      ? await Order.findById(idOrNumber).populate("items.product user appliedCoupon prescription")
      : await Order.findOne({ orderNumber: idOrNumber }).populate("items.product user appliedCoupon prescription");
    if (!doc) throw new ApiError(404, "Order not found");
    return doc;
  }

  static async update(id: string, payload: any) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid order id");
    const updated = await Order.findByIdAndUpdate(id, payload, { new: true });
    if (!updated) throw new ApiError(404, "Order not found");
    return updated;
  }
}


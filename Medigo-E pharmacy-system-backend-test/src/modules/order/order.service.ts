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
       console.log("Creating order with payload:", payload);

    if (!Array.isArray(items) || items.length === 0) throw new ApiError(400, "items is required");

    const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const normalizedItems = items.map((it: any) => ({
      productId: it.product || it.medicine || it.productId || it.id || null,
      productName: (it.name || it.productName || it.title || "").trim(),
      price: it.price != null ? Number(it.price) : null,
      qty: Number(it.qty),
    }));

    for (const it of normalizedItems) {
      if (!it.productId && !it.productName) {
        throw new ApiError(400, "product id or name is required in items");
      }
      if (!Number.isFinite(it.qty) || it.qty < 1) throw new ApiError(400, "qty must be >= 1");
      if (it.productId && !isValidId(String(it.productId))) {
        throw new ApiError(400, "Invalid product id in items");
      }
      if (it.price != null && (!Number.isFinite(it.price) || it.price < 0)) {
        throw new ApiError(400, "price must be a valid non-negative number");
      }
    }

    const productIds = normalizedItems
      .filter((i) => i.productId)
      .map((i) => new mongoose.Types.ObjectId(i.productId));

    const productNameSet = Array.from(
      new Set(normalizedItems.filter((i) => !i.productId && i.productName).map((i) => i.productName.toLowerCase())),
    );

    const nameQueries: any[] = [];
    for (const rawName of productNameSet) {
      const name = rawName.trim();
      if (!name) continue;
      const pattern = new RegExp(`^${escapeRegExp(name)}$`, "i");
      nameQueries.push({ name: pattern }, { genericName: pattern }, { brandName: pattern }, { slug: pattern });
    }

    const query: any = { status: "active" };
    if (productIds.length > 0 && nameQueries.length > 0) {
      query.$or = [{ _id: { $in: productIds } }, ...nameQueries];
    } else if (productIds.length > 0) {
      query._id = { $in: productIds };
    } else if (nameQueries.length > 0) {
      query.$or = nameQueries;
    }

    const products = await Product.find(query).select(
      "name price salePrice stockQty requiresPrescription currency slug genericName brandName",
    );
    if (productIds.length > 0) {
      const foundIds = new Set(products.map((p: any) => String(p._id)));
      if (productIds.some((id) => !foundIds.has(String(id)))) {
        throw new ApiError(400, "One or more products not found");
      }
    }

    const productMapById = new Map<string, any>(products.map((p: any) => [String(p._id), p]));
    const productMapByName = new Map<string, any>();
    for (const p of products) {
      if (p.name) productMapByName.set(String(p.name).toLowerCase(), p);
      if (p.genericName) productMapByName.set(String(p.genericName).toLowerCase(), p);
      if (p.brandName) productMapByName.set(String(p.brandName).toLowerCase(), p);
      if (p.slug) productMapByName.set(String(p.slug).toLowerCase(), p);
    }

    const orderItems = normalizedItems.map((it) => {
      const p = it.productId
        ? productMapById.get(String(it.productId))
        : productMapByName.get(String(it.productName).toLowerCase());
      if (!p) {
        throw new ApiError(400, `Product not found for item '${it.productName || it.productId}'`);
      }
      const selectedPrice = it.price != null
        ? it.price
        : p.salePrice != null
        ? Number(p.salePrice)
        : Number(p.price);
      if (!Number.isFinite(selectedPrice) || selectedPrice < 0) {
        throw new ApiError(400, `Invalid price for item '${it.productName || it.productId}'`);
      }
      const lineTotal = selectedPrice * it.qty;
      return {
        product: p._id,
        nameSnapshot: p.name,
        unitPrice: selectedPrice,
        qty: it.qty,
        lineTotal,
      };
    });

    const productMap = new Map<string, any>(products.map((p: any) => [String(p._id), p]));
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


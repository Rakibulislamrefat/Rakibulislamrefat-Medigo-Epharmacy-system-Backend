import mongoose from "mongoose";
import Order from "./Order.schema";
import Product from "../product/Product.schema";
import SpecialOffer from "../specialOffer/SpecialOffer.schema";
import Coupon from "../coupon/Coupon.schema";
import Cart from "../cart/Cart.schema";
import PaymentTransaction from "../paymentTransaction/PaymentTransaction.schema";
import User from "../user/User.schema";
import { ApiError, paginate, sendEmail } from "../../shared/utils";

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);
const ORDER_CANCEL_WINDOW_MS = 2 * 60 * 60 * 1000;
const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatMoney = (value: number) => Number(value || 0).toFixed(2);

const renderOrderItemsRows = (items: any[]) =>
  items
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.nameSnapshot)}</td><td align="center">${escapeHtml(item.qty)}</td><td align="right">BDT ${formatMoney(item.unitPrice)}</td><td align="right">BDT ${formatMoney(item.lineTotal)}</td></tr>`,
    )
    .join("");

const renderAddressHtml = (address: any) => {
  if (!address) return "";
  const lines = [address.line1, address.line2, address.city, address.state, address.postcode, address.country].filter(Boolean);
  return lines.map((line: string) => `<div>${escapeHtml(line)}</div>`).join("");
};

const renderAdditionalPaymentInfo = (paymentInfo: any) => {
  if (!paymentInfo || typeof paymentInfo !== "object") return "";

  const entries = Object.entries(paymentInfo).filter(
    ([key, value]) =>
      value != null &&
      !["provider", "reference", "currency", "amount", "status", "createdAt", "transactionId", "method"].includes(key),
  );

  if (entries.length === 0) return "";

  return `
    <h4>Additional Payment Information</h4>
    <table cellpadding="6" cellspacing="0" border="1" style="border-collapse:collapse; width:100%; max-width:600px; margin-top:10px;">
      ${entries
        .map(
          ([key, value]) =>
            `<tr><td><strong>${escapeHtml(String(key))}</strong></td><td>${escapeHtml(String(value))}</td></tr>`,
        )
        .join("")}
    </table>
  `;
};

const renderPaymentInfoHtml = (paymentStatus: string, transaction: any, paymentInfo: any) => {
  if (paymentStatus !== "paid") {
    return `<p><strong>Payment Status:</strong> ${escapeHtml(paymentStatus)}</p>`;
  }

  const details: Array<{ label: string; value: string }> = [];

  if (transaction) {
    details.push({ label: "Provider", value: transaction.provider || "N/A" });
    details.push({ label: "Reference", value: transaction.reference || "N/A" });
    details.push({ label: "Amount", value: `${transaction.currency || "BDT"} ${formatMoney(transaction.amount)}` });
    details.push({ label: "Status", value: transaction.status || "N/A" });
    details.push({ label: "Paid At", value: transaction.createdAt ? new Date(transaction.createdAt).toISOString() : "N/A" });
  }

  if (!transaction && paymentInfo) {
    if (paymentInfo.provider) details.push({ label: "Provider", value: String(paymentInfo.provider) });
    if (paymentInfo.reference) details.push({ label: "Reference", value: String(paymentInfo.reference) });
    if (paymentInfo.currency || paymentInfo.amount) {
      details.push({ label: "Amount", value: `${paymentInfo.currency || "BDT"} ${formatMoney(Number(paymentInfo.amount || 0))}` });
    }
    if (paymentInfo.method) details.push({ label: "Payment Method", value: String(paymentInfo.method) });
    if (paymentInfo.transactionId) details.push({ label: "Transaction ID", value: String(paymentInfo.transactionId) });
  }

  if (details.length === 0) {
    return `<p><strong>Payment Status:</strong> paid</p><p>Payment details are not available for this invoice.</p>`;
  }

  return `
    <p><strong>Payment Status:</strong> paid</p>
    <table cellpadding="6" cellspacing="0" border="1" style="border-collapse:collapse; width:100%; max-width:600px;">
      ${details.map((detail) => `<tr><td><strong>${escapeHtml(detail.label)}</strong></td><td>${escapeHtml(detail.value)}</td></tr>`).join("")}
    </table>
    ${renderAdditionalPaymentInfo(paymentInfo)}
  `;
};

const renderInvoiceHtml = (order: any, customerName: string, transaction: any) => {
  const addressHtml = renderAddressHtml(order.deliveryAddress);
  const itemsHtml = renderOrderItemsRows(order.items || []);

  return `
    <div style="font-family:Arial,sans-serif; color:#333; max-width:700px; margin:0 auto;">
      <h2>Medigo Order Invoice</h2>
      <p>Hi ${escapeHtml(customerName)},</p>
      <p>Thank you for your order. Below is the invoice for <strong>${escapeHtml(order.orderNumber)}</strong>.</p>

      <h3>Order Summary</h3>
      <table cellpadding="6" cellspacing="0" border="1" style="border-collapse:collapse; width:100%; max-width:700px;">
        <thead>
          <tr style="background:#f7f7f7;"><th align="left">Item</th><th align="center">Qty</th><th align="right">Unit Price</th><th align="right">Line Total</th></tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <h3>Totals</h3>
      <table cellpadding="6" cellspacing="0" border="0" style="width:100%; max-width:700px;">
        <tr><td>Subtotal</td><td align="right">BDT ${formatMoney(order.subtotal)}</td></tr>
        <tr><td>Delivery Fee</td><td align="right">BDT ${formatMoney(order.deliveryFee)}</td></tr>
        <tr><td>Discount</td><td align="right">BDT ${formatMoney(order.discountTotal)}</td></tr>
        <tr style="font-weight:bold;"><td>Total</td><td align="right">BDT ${formatMoney(order.grandTotal)}</td></tr>
      </table>

      <h3>Delivery Details</h3>
      <div>${escapeHtml(order.contactName || "")}</div>
      <div>${escapeHtml(order.contactPhone || "")}</div>
      <div>${addressHtml || "No delivery address provided."}</div>

      <h3>Payment Details</h3>
      ${renderPaymentInfoHtml(order.paymentStatus, transaction, order.paymentInfo)}

      <p>If you have any questions, please contact our support team.</p>
      <p>- Medigo Team</p>
    </div>
  `;
};

export const sendPaidOrderInvoice = async (order: any, transaction: any) => {
  let user = order.user;
  if (!user || (typeof user === "object" && !user.email)) {
    user = await User.findById(order.user).select("name email");
  }
  if (!user?.email) return;

  const customerName = user.name || order.contactName || "Customer";
  await sendEmail({
    to: user.email,
    subject: `Medigo - Invoice for ${order.orderNumber}`,
    html: renderInvoiceHtml(order, customerName, transaction),
  });
};

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
    const { items, deliveryFee, contactName, contactPhone, deliveryAddress, notes, appliedCoupon, prescription, paymentStatus, status, paymentInfo } =
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
    let delivery = Number(deliveryFee || 0);

    // Determine discount. `appliedCoupon` may be a coupon id (ObjectId) or a special offer code (string)
    let discount = 0;
    let appliedCouponRef: any = null;
    if (appliedCoupon) {
      const asId = String(appliedCoupon);
      if (isValidId(asId)) {
        discount = await computeCouponDiscount(asId, subtotal);
        appliedCouponRef = asId;
      } else {
        // try special offers by code
        const code = String(appliedCoupon).toUpperCase().trim();
        const special = await SpecialOffer.findOne({ code });
        if (special) {
          appliedCouponRef = special._id;
          const label = String(special.discount || "").toUpperCase();
          // percentage e.g. "15% OFF"
          const pctMatch = label.match(/(\d+)%/);
          if (pctMatch) {
            const pct = Number(pctMatch[1] || 0);
            discount = +(subtotal * (pct / 100));
          } else if (label.includes("FREE DELIVERY")) {
            // free delivery -> discount equals delivery fee (set delivery to 0)
            discount = 0;
            delivery = 0;
          } else {
            // try to parse numeric amount from label
            const numMatch = label.match(/(\d+[\.,]?\d*)/);
            if (numMatch) {
              discount = Number(numMatch[1].replace(/,/g, "")) || 0;
            }
          }
        }
      }
    }

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
      appliedCoupon: appliedCouponRef || null,
      paymentInfo: paymentInfo || null,
    });

    // populate appliedCoupon for response so frontend can show details
    const populated = await Order.findById(created._id).populate("appliedCoupon");

    await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } });

    if (String(paymentStatus || "unpaid") === "paid") {
      const [user, paymentTx] = await Promise.all([
        User.findById(userId).select("name email"),
        PaymentTransaction.findOne({ order: created._id, status: "success" }).sort({ createdAt: -1 }),
      ]);

      sendPaidOrderInvoice(populated || created, paymentTx).catch(() => {});
    }

    return populated || created;
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

  static async trackForUser(userId: string, idOrNumber: string) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user id");

    const filter = isValidId(idOrNumber)
      ? { _id: idOrNumber, user: userId }
      : { orderNumber: idOrNumber, user: userId };

    const order: any = await Order.findOne(filter).populate("items.product appliedCoupon prescription");
    if (!order) throw new ApiError(404, "Order not found for this user");

    // Determine expected status flow based on order number prefix (FUL vs MDG)
    const FUL_FLOW = ["pending_pickup", "picked", "packed", "ready_for_delivery", "delivered"];
    const MDG_REQUEST_FLOW = ["pending", "confirmed", "processing", "ready", "shipped", "delivered"];
    const terminalStatuses = ["cancelled", "refunded"];

    const orderNumberUpper = String(order.orderNumber || "").toUpperCase();
    const isFul = orderNumberUpper.startsWith("FUL");
    const statusFlow = isFul ? FUL_FLOW : MDG_REQUEST_FLOW;

    const currentStatus = String(order.status);
    const normalize = (s: any) => String(s || "").toLowerCase().trim();
    const currentIndex = statusFlow.findIndex((s) => normalize(s) === normalize(currentStatus));

    const timeline = statusFlow.map((status, index) => ({
      status,
      completed: currentIndex >= index && currentIndex !== -1,
      current: normalize(currentStatus) === normalize(status),
      timestamp:
        index === 0
          ? order.createdAt
          : normalize(currentStatus) === normalize(status)
          ? order.updatedAt
          : null,
    }));

    // If order is in a terminal status not present in flow (e.g., cancelled/refunded), append it
    if (terminalStatuses.includes(normalize(currentStatus))) {
      timeline.push({
        status: currentStatus,
        completed: true,
        current: true,
        timestamp: order.updatedAt,
      });
    }

    return {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      placedAt: order.createdAt,
      lastUpdatedAt: order.updatedAt,
      estimatedDelivery: order.estimatedDelivery || null,
      timeline,
      deliveryAddress: order.deliveryAddress,
      contactPhone: order.contactPhone,
      items: order.items,
      totals: {
        subtotal: order.subtotal,
        discountTotal: order.discountTotal,
        deliveryFee: order.deliveryFee,
        grandTotal: order.grandTotal,
      },
    };
  }

  static async cancelForUser(userId: string, idOrNumber: string, payload: any = {}) {
    if (!isValidId(userId)) throw new ApiError(400, "Invalid user id");

    const filter = isValidId(idOrNumber)
      ? { _id: idOrNumber, user: userId }
      : { orderNumber: idOrNumber, user: userId };

    const order: any = await Order.findOne(filter).populate("user", "name email");
    if (!order) throw new ApiError(404, "Order not found for this user");

    if (["cancelled", "refunded"].includes(String(order.status))) {
      throw new ApiError(400, "Order is already cancelled");
    }

    if (["shipped", "delivered"].includes(String(order.status))) {
      throw new ApiError(400, "Order cannot be cancelled after it has shipped");
    }

    const placedAt = new Date(order.createdAt).getTime();
    if (Date.now() - placedAt > ORDER_CANCEL_WINDOW_MS) {
      throw new ApiError(400, "Order can only be cancelled within 2 hours after creating it");
    }

    const refundTransaction: any = await PaymentTransaction.findOne({
      order: order._id,
      status: "success",
    }).sort({ createdAt: -1 });

    order.status = "cancelled";
    if (String(order.paymentStatus) === "paid" && refundTransaction) {
      order.paymentStatus = "refunded";
      refundTransaction.status = "refunded";
      refundTransaction.raw = {
        ...(refundTransaction.raw || {}),
        refund: {
          reason: payload?.reason || "Order cancelled by user",
          requestedAt: new Date(),
        },
      };
      await refundTransaction.save();
    }
    await order.save();

    const user = order.user as any;
    const email = user?.email;
    if (email) {
      const customerName = user?.name || order.contactName || "Customer";
      const reason = payload?.reason ? `<p><strong>Reason:</strong> ${escapeHtml(payload.reason)}</p>` : "";
      const itemsHtml = (order.items || [])
        .map((item: any) => `<li>${escapeHtml(item.nameSnapshot)} x ${item.qty} - BDT ${Number(item.lineTotal || 0).toFixed(2)}</li>`)
        .join("");

      await sendEmail({
        to: email,
        subject: `Medigo - Order ${order.orderNumber} cancelled`,
        html: `
          <h2>Order Cancelled</h2>
          <p>Hi ${escapeHtml(customerName)},</p>
          <p>Your order <strong>${escapeHtml(order.orderNumber)}</strong> has been cancelled successfully.</p>
          ${reason}
          <ul>${itemsHtml}</ul>
          <p><strong>Total:</strong> BDT ${Number(order.grandTotal || 0).toFixed(2)}</p>
          <p>- Medigo Team</p>
        `,
      }).catch(() => {});

      if (refundTransaction) {
        await sendEmail({
          to: email,
          subject: `Medigo - Refund information for ${order.orderNumber}`,
          html: `
            <h2>Payment Refund Information</h2>
            <p>Hi ${escapeHtml(customerName)},</p>
            <p>Your paid order <strong>${escapeHtml(order.orderNumber)}</strong> was cancelled, so the refund information is below.</p>
            <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;">
              <tr><td><strong>Order Number</strong></td><td>${escapeHtml(order.orderNumber)}</td></tr>
              <tr><td><strong>Payment Provider</strong></td><td>${escapeHtml(refundTransaction.provider || "N/A")}</td></tr>
              <tr><td><strong>Transaction Reference</strong></td><td>${escapeHtml(refundTransaction.reference || "N/A")}</td></tr>
              <tr><td><strong>Refund Amount</strong></td><td>${escapeHtml(refundTransaction.currency || "BDT")} ${Number(refundTransaction.amount || order.grandTotal || 0).toFixed(2)}</td></tr>
              <tr><td><strong>Refund Status</strong></td><td>${escapeHtml(refundTransaction.status)}</td></tr>
              <tr><td><strong>Requested At</strong></td><td>${new Date().toISOString()}</td></tr>
            </table>
            <p>Please keep this email for your records.</p>
            <p>- Medigo Team</p>
          `,
        }).catch(() => {});
      }
    }

    return {
      order,
      refund: refundTransaction
        ? {
            provider: refundTransaction.provider,
            reference: refundTransaction.reference,
            amount: refundTransaction.amount,
            currency: refundTransaction.currency,
            status: refundTransaction.status,
          }
        : null,
    };
  }

  static async update(id: string, payload: any) {
    if (!isValidId(id)) throw new ApiError(400, "Invalid order id");
    const updated = await Order.findByIdAndUpdate(id, payload, { new: true });
    if (!updated) throw new ApiError(404, "Order not found");
    return updated;
  }
}


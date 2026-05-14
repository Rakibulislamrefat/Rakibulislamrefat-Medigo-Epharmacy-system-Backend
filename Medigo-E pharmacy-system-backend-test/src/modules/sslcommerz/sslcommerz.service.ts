import { ApiError } from "../../shared/utils";
import env from "../../config/env";
import Order from "../order/Order.schema";
import PaymentTransaction from "../paymentTransaction/PaymentTransaction.schema";

const SSLCommerzPayment = require("sslcommerz-lts");

const getSSLCommerzClient = () => {
  if (!env.SSL_APP_STORE_ID || !env.SSL_APP_PASSWORD) {
    throw new ApiError(500, "SSLCommerz credentials are not configured");
  }

  return new SSLCommerzPayment(
    env.SSL_APP_STORE_ID,
    env.SSL_APP_PASSWORD,
    env.SSL_IS_LIVE === "true"
  );
};

const getApiBaseUrl = () => `${env.BACKEND_URL.replace(/\/$/, "")}/api/v1`;

export const generateSslTransactionId = (orderId: string) => {
  const now = new Date();
  const date = now.toLocaleDateString("en-GB").replace(/\//g, "");
  const time = now
    .toLocaleTimeString("en-GB", {
      hour12: false,
    })
    .replace(/:/g, "")
    .slice(0, 6);

  return `ORDER-${date}-${time}-${String(orderId).slice(-6)}`;
};

export class SSLCommerzService {
  static async initiatePayment(orderId: string, customerInfo: any, userId: string) {
    const order = await (Order as any).findById(orderId).populate("user", "name email");
    if (!order) {
      throw new ApiError(404, "Order not found");
    }

    if (String(order.user._id || order.user) !== String(userId)) {
      throw new ApiError(403, "Access denied");
    }

    if (order.paymentStatus === "paid") {
      throw new ApiError(400, "Order is already paid");
    }

    const amount = Number(order.grandTotal || 0);
    if (amount <= 0) {
      throw new ApiError(400, "Order amount must be greater than zero");
    }

    const transactionId = generateSslTransactionId(orderId);

    const payload = {
      total_amount: amount,
      currency: "BDT",
      tran_id: transactionId,
      success_url: `${getApiBaseUrl()}/sslcommerz/success`,
      fail_url: `${getApiBaseUrl()}/sslcommerz/fail`,
      cancel_url: `${getApiBaseUrl()}/sslcommerz/cancel`,
      ipn_url: `${getApiBaseUrl()}/sslcommerz/ipn`,
      shipping_method: "NO",
      product_name: `Order ${order.orderNumber}`,
      product_category: "E-Pharmacy",
      product_profile: "service",
      cus_name: customerInfo?.name || order.contactName || "Customer",
      cus_email: customerInfo?.email || (order.user as any)?.email || "no-reply@example.com",
      cus_add1: customerInfo?.address || order.deliveryAddress?.line1 || "N/A",
      cus_city: customerInfo?.city || order.deliveryAddress?.city || "Dhaka",
      cus_postcode: customerInfo?.postcode || order.deliveryAddress?.postcode || "1200",
      cus_country: customerInfo?.country || order.deliveryAddress?.country || "Bangladesh",
      cus_phone: customerInfo?.phone || order.contactPhone || "N/A",
      value_a: orderId,
      value_b: "order_payment",
      value_c: String(userId),
      value_d: String(order._id),
    };

    const sslcz = getSSLCommerzClient();
    const apiResponse = await sslcz.init(payload);

    if (!apiResponse || !apiResponse.GatewayPageURL) {
      throw new ApiError(500, "Failed to initiate payment with SSLCommerz");
    }

    await (PaymentTransaction as any).create({
      order: orderId,
      user: userId,
      provider: "sslcommerz",
      amount,
      currency: "BDT",
      status: "initiated",
      reference: transactionId,
      raw: {
        initResponse: apiResponse,
        customerInfo,
      },
    });

    return {
      paymentUrl: apiResponse.GatewayPageURL,
      transactionId,
      amount,
      order,
    };
  }

  static async processIpn(payload: any) {
    const txnId = payload.tran_id || payload.tran_id;
    if (!txnId) {
      throw new ApiError(400, "Transaction id is missing from IPN payload");
    }

    const transaction = await (PaymentTransaction as any).findOne({ reference: txnId });
    if (!transaction) {
      throw new ApiError(404, "Payment transaction not found");
    }

    const order = await (Order as any).findById(transaction.order);
    if (!order) {
      throw new ApiError(404, "Order not found for payment transaction");
    }

    transaction.raw = { ...transaction.raw, ipn: payload };

    if (payload.status === "VALID") {
      transaction.status = "success";
      order.paymentStatus = "paid";
      if (order.status === "pending") {
        order.status = "confirmed";
      }
    } else if (payload.status === "FAILED") {
      transaction.status = "failed";
      order.paymentStatus = "failed";
    }

    await Promise.all([transaction.save(), order.save()]);

    return { transaction, order };
  }

  static async validateTransaction(transactionId: string) {
    const transaction = await (PaymentTransaction as any).findOne({ reference: transactionId }).populate("order user");
    if (!transaction) {
      throw new ApiError(404, "Transaction not found");
    }

    const order = await (Order as any).findById(transaction.order).populate("user", "name email");
    return { transaction, order };
  }
}

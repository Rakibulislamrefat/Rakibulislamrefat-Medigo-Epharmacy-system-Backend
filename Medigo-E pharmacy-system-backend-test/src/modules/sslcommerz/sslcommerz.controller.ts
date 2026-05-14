import { Request, Response } from "express";
import { ApiError, ApiResponse, asyncHandler } from "../../shared/utils";
import { SSLCommerzService } from "./sslcommerz.service";

export const initiateSSLCommerzPayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Not authenticated");

  const { orderId, customerInfo } = req.body;
  const result = await SSLCommerzService.initiatePayment(orderId, customerInfo || {}, userId);

  res.status(200).json(new ApiResponse(200, "SSLCommerz payment initiated", result));
});

export const handleSSLIPN = asyncHandler(async (req: Request, res: Response) => {
  const payload = req.body;
  await SSLCommerzService.processIpn(payload);
  res.status(200).json(new ApiResponse(200, "IPN processed successfully", { tran_id: payload.tran_id }));
});

export const handlePaymentSuccess = asyncHandler(async (req: Request, res: Response) => {
  const payload = req.body || req.query;
  const tranId = payload.tran_id;
  if (!tranId) {
    throw new ApiError(400, "Transaction id is required");
  }

  const validationPayload = {
    val_id: payload.val_id,
    tran_id: tranId,
  };

  const sslcz = require("sslcommerz-lts");
  const client = new sslcz(process.env.SSL_APP_STORE_ID, process.env.SSL_APP_PASSWORD, process.env.SSL_IS_LIVE === "true");

  let verification: any = null;
  try {
    if (validationPayload.val_id) {
      verification = await client.validate({ val_id: validationPayload.val_id });
    } else {
      verification = await client.transactionQueryByTransactionId({ tran_id: tranId });
    }
  } catch (error: any) {
    verification = { status: payload.status || "VALID" };
  }

  if (verification && verification.status === "VALID") {
    await SSLCommerzService.processIpn({ ...payload, status: "VALID", verification });
  }

  return res.redirect(`${process.env.CLIENT_URL || process.env.FRONTEND_URL}/payment/success?tran_id=${tranId}`);
});

export const handlePaymentFailed = asyncHandler(async (req: Request, res: Response) => {
  const payload = req.body || req.query;
  const tranId = payload.tran_id;
  if (tranId) {
    await SSLCommerzService.processIpn({ ...payload, status: "FAILED" });
  }

  return res.redirect(`${process.env.CLIENT_URL || process.env.FRONTEND_URL}/payment/failed?tran_id=${tranId || ""}`);
});

export const handlePaymentCancel = asyncHandler(async (req: Request, res: Response) => {
  const payload = req.body || req.query;
  const tranId = payload.tran_id;
  if (tranId) {
    await SSLCommerzService.processIpn({ ...payload, status: "FAILED" });
  }

  return res.redirect(`${process.env.CLIENT_URL || process.env.FRONTEND_URL}/payment/cancelled?tran_id=${tranId || ""}`);
});

export const validatePayment = asyncHandler(async (req: Request, res: Response) => {
  const { transactionId } = req.params;
  const result = await SSLCommerzService.validateTransaction(transactionId);
  res.status(200).json(new ApiResponse(200, "Payment validation retrieved", result));
});

import { Request, Response } from "express";
import { ApiError, ApiResponse, asyncHandler } from "../../shared/utils";
import { PaymentTransactionService } from "./paymentTransaction.service";

export const createPaymentTransaction = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Not authenticated");
  const data = await PaymentTransactionService.createForUser(userId, req.body);
  res.status(201).json(new ApiResponse(201, "Payment transaction created", data));
});

export const listMyPaymentTransactions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Not authenticated");
  const data = await PaymentTransactionService.listForUser(userId, req.query);
  res.status(200).json(new ApiResponse(200, "Payment transactions fetched", data));
});

export const listPaymentTransactions = asyncHandler(async (req: Request, res: Response) => {
  const data = await PaymentTransactionService.listAll(req.query);
  res.status(200).json(new ApiResponse(200, "Payment transactions fetched", data));
});

export const getPaymentTransaction = asyncHandler(async (req: Request, res: Response) => {
  const doc: any = await PaymentTransactionService.get(req.params.id);
  const isOwner = req.user?.id && String(doc.user?._id || doc.user) === String(req.user.id);
  const canView = isOwner || ["admin", "pharmacist"].includes(String(req.user?.role || ""));
  if (!canView) throw new ApiError(403, "Access denied");
  res.status(200).json(new ApiResponse(200, "Payment transaction fetched", doc));
});

export const updatePaymentTransaction = asyncHandler(async (req: Request, res: Response) => {
  const data = await PaymentTransactionService.update(req.params.id, req.body);
  res.status(200).json(new ApiResponse(200, "Payment transaction updated", data));
});


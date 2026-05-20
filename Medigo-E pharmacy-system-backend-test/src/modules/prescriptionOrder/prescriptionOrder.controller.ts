import { Request, Response } from "express";
import { ApiError, ApiResponse, asyncHandler } from "../../shared/utils";
import { PrescriptionOrderService } from "./prescriptionOrder.service";
import { SSLCommerzService } from "../sslcommerz/sslcommerz.service";

const getUserId = (req: Request) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Not authenticated");
  return userId;
};

export const createPrescriptionOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file?.path) throw new ApiError(400, "prescriptionFile is required");

  const data = await PrescriptionOrderService.createForUser(getUserId(req), {
    ...req.body,
    prescriptionFile: req.file.path,
  });

  res.status(201).json(new ApiResponse(201, "Prescription order created", data));
});

export const listMyPrescriptionOrders = asyncHandler(async (req: Request, res: Response) => {
  const data = await PrescriptionOrderService.listForUser(getUserId(req), req.query);
  res.status(200).json(new ApiResponse(200, "Prescription orders fetched", data));
});

export const listPrescriptionOrders = asyncHandler(async (req: Request, res: Response) => {
  const data = await PrescriptionOrderService.listAll(req.query);
  res.status(200).json(new ApiResponse(200, "Prescription orders fetched", data));
});

export const getMyPrescriptionOrder = asyncHandler(async (req: Request, res: Response) => {
  const data = await PrescriptionOrderService.getForUser(getUserId(req), req.params.id);
  res.status(200).json(new ApiResponse(200, "Prescription order fetched", data));
});

export const getPrescriptionOrder = asyncHandler(async (req: Request, res: Response) => {
  const data = await PrescriptionOrderService.getById(req.params.id);
  res.status(200).json(new ApiResponse(200, "Prescription order fetched", data));
});

export const updatePrescriptionOrder = asyncHandler(async (req: Request, res: Response) => {
  const payload = { ...req.body };
  if (req.file?.path) payload.prescriptionFile = req.file.path;

  const data = await PrescriptionOrderService.update(req.params.id, payload);
  res.status(200).json(new ApiResponse(200, "Prescription order updated", data));
});

export const payPrescriptionOrder = asyncHandler(async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { method, customerInfo } = req.body;

  const data =
    method === "cash_on_delivery"
      ? await PrescriptionOrderService.selectCashOnDeliveryPayment(userId, req.params.id)
      : await SSLCommerzService.initiatePrescriptionPayment(req.params.id, customerInfo || {}, userId);

  res.status(200).json(new ApiResponse(200, "Prescription order payment confirmed", data));
});

export const deletePrescriptionOrder = asyncHandler(async (req: Request, res: Response) => {
  const data = await PrescriptionOrderService.remove(req.params.id);
  res.status(200).json(new ApiResponse(200, "Prescription order deleted", data));
});

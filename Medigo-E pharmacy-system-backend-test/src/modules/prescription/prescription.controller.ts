import { Request, Response } from "express";
import { ApiError, ApiResponse, asyncHandler } from "../../shared/utils";
import { PrescriptionService } from "./prescription.service";

export const submitPrescription = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Not authenticated");
  const data = await PrescriptionService.submitForUser(userId, req.body);
  res.status(201).json(new ApiResponse(201, "Prescription submitted", data));
});

export const listMyPrescriptions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Not authenticated");
  const data = await PrescriptionService.listForUser(userId, req.query);
  res.status(200).json(new ApiResponse(200, "Prescriptions fetched", data));
});

export const listPrescriptions = asyncHandler(async (req: Request, res: Response) => {
  const data = await PrescriptionService.listAll(req.query);
  res.status(200).json(new ApiResponse(200, "Prescriptions fetched", data));
});

export const getPrescription = asyncHandler(async (req: Request, res: Response) => {
  const doc: any = await PrescriptionService.get(req.params.id);
  const isOwner = req.user?.id && String(doc.user?._id || doc.user) === String(req.user.id);
  const canView = isOwner || ["admin", "pharmacist"].includes(String(req.user?.role || ""));
  if (!canView) throw new ApiError(403, "Access denied");
  res.status(200).json(new ApiResponse(200, "Prescription fetched", doc));
});

export const adminUpdatePrescription = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Not authenticated");
  const data = await PrescriptionService.adminUpdate(req.params.id, req.body, userId);
  res.status(200).json(new ApiResponse(200, "Prescription updated", data));
});


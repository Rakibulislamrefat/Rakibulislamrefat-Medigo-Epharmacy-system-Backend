import { Request, Response } from "express";
import { ApiError, ApiResponse, asyncHandler } from "../../shared/utils";
import { ConsultancyService } from "./consultancy.service";

export const createConsultancy = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Not authenticated");
  const data = await ConsultancyService.createForUser(userId, req.body);
  res.status(201).json(new ApiResponse(201, "Consultancy created", data));
});

export const listMyConsultancies = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Not authenticated");
  const data = await ConsultancyService.listForUser(userId, req.query);
  res.status(200).json(new ApiResponse(200, "Consultancies fetched", data));
});

export const listConsultancies = asyncHandler(async (req: Request, res: Response) => {
  const data = await ConsultancyService.listAll(req.query);
  res.status(200).json(new ApiResponse(200, "Consultancies fetched", data));
});

export const getConsultancy = asyncHandler(async (req: Request, res: Response) => {
  const doc: any = await ConsultancyService.get(req.params.id);
  const isOwner = req.user?.id && String(doc.user?._id || doc.user) === String(req.user.id);
  const canView = isOwner || ["admin", "doctor"].includes(String(req.user?.role || ""));
  if (!canView) throw new ApiError(403, "Access denied");
  res.status(200).json(new ApiResponse(200, "Consultancy fetched", doc));
});

export const updateConsultancy = asyncHandler(async (req: Request, res: Response) => {
  const data = await ConsultancyService.update(req.params.id, req.body);
  res.status(200).json(new ApiResponse(200, "Consultancy updated", data));
});


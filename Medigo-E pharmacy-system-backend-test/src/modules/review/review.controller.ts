import { Request, Response } from "express";
import { ApiError, ApiResponse, asyncHandler } from "../../shared/utils";
import { ReviewService } from "./review.service";

export const createReview = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Not authenticated");
  const data = await ReviewService.createForUser(userId, req.body);
  res.status(201).json(new ApiResponse(201, "Review created", data));
});

export const listReviews = asyncHandler(async (req: Request, res: Response) => {
  const data = await ReviewService.list(req.query);
  res.status(200).json(new ApiResponse(200, "Reviews fetched", data));
});

export const listMyReviews = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Not authenticated");
  const data = await ReviewService.listForUser(userId, req.query);
  res.status(200).json(new ApiResponse(200, "Reviews fetched", data));
});

export const deleteReview = asyncHandler(async (req: Request, res: Response) => {
  const doc: any = await ReviewService.get(req.params.id);
  const isOwner = req.user?.id && String(doc.user?._id || doc.user) === String(req.user.id);
  const canDelete = isOwner || ["admin"].includes(String(req.user?.role || ""));
  if (!canDelete) throw new ApiError(403, "Access denied");
  const data = await ReviewService.remove(req.params.id);
  res.status(200).json(new ApiResponse(200, "Review deleted", data));
});


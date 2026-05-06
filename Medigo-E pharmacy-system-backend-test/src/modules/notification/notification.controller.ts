import { Request, Response } from "express";
import { ApiError, ApiResponse, asyncHandler } from "../../shared/utils";
import { NotificationService } from "./notification.service";

export const createNotification = asyncHandler(async (req: Request, res: Response) => {
  const data = await NotificationService.create(req.body);
  res.status(201).json(new ApiResponse(201, "Notification created", data));
});

export const listMyNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Not authenticated");
  const data = await NotificationService.listForUser(userId, req.query);
  res.status(200).json(new ApiResponse(200, "Notifications fetched", data));
});

export const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Not authenticated");
  const data = await NotificationService.markRead(userId, req.params.id);
  res.status(200).json(new ApiResponse(200, "Notification marked read", data));
});


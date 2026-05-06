import { Request, Response } from "express";
import { ApiError, ApiResponse, asyncHandler } from "../../shared/utils";
import { UserService } from "./user.service";

export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const data = await UserService.getPublicProfile(req.params.id);
  res.status(200).json(new ApiResponse(200, "User fetched", data));
});

export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const data = await UserService.listUsers(req.query);
  res.status(200).json(new ApiResponse(200, "Users fetched", data));
});

export const updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const status = String(req.body?.status || "");
  const data = await UserService.updateUserStatus(req.params.id, status);
  res.status(200).json(new ApiResponse(200, "User status updated", data));
});

export const updateAvatar = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Not authenticated");
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) throw new ApiError(400, "No file uploaded");
  const avatarUrl = `/uploads/${file.filename}`;
  const data = await UserService.updateAvatar(userId, avatarUrl);
  res.status(200).json(new ApiResponse(200, "Avatar updated", data));
});

export const promoteToAdmin = asyncHandler(async (req: Request, res: Response) => {
  const data = await UserService.promoteToAdminDev(req.body || {});
  res.status(200).json(new ApiResponse(200, "User promoted to admin", data));
});

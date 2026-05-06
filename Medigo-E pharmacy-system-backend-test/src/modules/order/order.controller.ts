import { Request, Response } from "express";
import { ApiError, ApiResponse, asyncHandler } from "../../shared/utils";
import { OrderService } from "./order.service";

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Not authenticated");
  const data = await OrderService.createForUser(userId, req.body);
  res.status(201).json(new ApiResponse(201, "Order created", data));
});

export const listMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Not authenticated");
  const data = await OrderService.listForUser(userId, req.query);
  res.status(200).json(new ApiResponse(200, "Orders fetched", data));
});

export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  const data = await OrderService.listAll(req.query);
  res.status(200).json(new ApiResponse(200, "Orders fetched", data));
});

export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  const doc: any = await OrderService.getByIdOrNumber(req.params.idOrNumber);
  const isOwner = req.user?.id && String(doc.user?._id || doc.user) === String(req.user.id);
  const canView = isOwner || ["admin", "pharmacist"].includes(String(req.user?.role || ""));
  if (!canView) throw new ApiError(403, "Access denied");
  res.status(200).json(new ApiResponse(200, "Order fetched", doc));
});

export const updateOrder = asyncHandler(async (req: Request, res: Response) => {
  const data = await OrderService.update(req.params.id, req.body);
  res.status(200).json(new ApiResponse(200, "Order updated", data));
});


import { Request, Response } from "express";
import { ApiError, ApiResponse, asyncHandler } from "../../shared/utils";
import { CartService } from "./cart.service";

export const getMyCart = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Not authenticated");
  const data = await CartService.getOrCreate(userId);
  res.status(200).json(new ApiResponse(200, "Cart fetched", data));
});

export const addToCart = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Not authenticated");
  const data = await CartService.addItem(userId, req.body);
  res.status(200).json(new ApiResponse(200, "Cart updated", data));
});

export const addProductToCart = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Not authenticated");

  const productId = req.params.productId || req.body.productId || req.body.product;
  const qty = Number(req.body.qty || 1);
  const data = await CartService.addProduct(userId, productId, qty);

  res.status(200).json(new ApiResponse(200, "Product added to cart", data));
});

export const updateCartItem = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Not authenticated");
  const data = await CartService.updateItem(userId, req.body);
  res.status(200).json(new ApiResponse(200, "Cart updated", data));
});

export const removeCartItem = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Not authenticated");
  const data = await CartService.removeItem(userId, req.params.productId);
  res.status(200).json(new ApiResponse(200, "Cart updated", data));
});

export const clearCart = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Not authenticated");
  const data = await CartService.clear(userId);
  res.status(200).json(new ApiResponse(200, "Cart cleared", data));
});

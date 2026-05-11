import { Request, Response } from "express";
import { ApiResponse, asyncHandler } from "../../shared/utils";
import { ProductService } from "./product.service";

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const payload = { ...req.body };

  // Handle image upload
  if (req.file) {
    payload.images = [req.file.path]; // Cloudinary URL
  }

  const data = await ProductService.create(payload);
  res.status(201).json(new ApiResponse(201, "Product created", data));
});

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const data = await ProductService.list(req.query);
  res.status(200).json(new ApiResponse(200, "Products fetched", data));
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const data = await ProductService.getByIdOrSlug(req.params.idOrSlug);
  res.status(200).json(new ApiResponse(200, "Product fetched", data));
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const payload = { ...req.body };

  // Handle image upload
  if (req.file) {
    payload.images = [req.file.path]; // Cloudinary URL
  }

  const data = await ProductService.update(req.params.id, payload);
  res.status(200).json(new ApiResponse(200, "Product updated", data));
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const data = await ProductService.remove(req.params.id);
  res.status(200).json(new ApiResponse(200, "Product deleted", data));
});

export const getMedicinesByCategory = asyncHandler(async (req: Request, res: Response) => {
  const data = await ProductService.getMedicinesByCategory(req.query);
  res.status(200).json(new ApiResponse(200, "Medicines by category fetched", data));
});

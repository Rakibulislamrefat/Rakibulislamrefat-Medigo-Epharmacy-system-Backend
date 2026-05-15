import { Request, Response } from "express";
import { ApiError, ApiResponse, asyncHandler } from "../../shared/utils";
import { AddressService } from "./addtess.service";

const getUserId = (req: Request) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Not authenticated");
  return userId;
};

export const createAddress = asyncHandler(async (req: Request, res: Response) => {
  const data = await AddressService.create(getUserId(req), req.body);
  res.status(201).json(new ApiResponse(201, "Address created", data));
});

export const listMyAddresses = asyncHandler(async (req: Request, res: Response) => {
  const data = await AddressService.list(getUserId(req));
  res.status(200).json(new ApiResponse(200, "Addresses fetched", data));
});

export const getAddress = asyncHandler(async (req: Request, res: Response) => {
  const data = await AddressService.getById(getUserId(req), req.params.id);
  res.status(200).json(new ApiResponse(200, "Address fetched", data));
});

export const updateAddress = asyncHandler(async (req: Request, res: Response) => {
  const data = await AddressService.update(getUserId(req), req.params.id, req.body);
  res.status(200).json(new ApiResponse(200, "Address updated", data));
});

export const setDefaultAddress = asyncHandler(async (req: Request, res: Response) => {
  const data = await AddressService.setDefault(getUserId(req), req.params.id);
  res.status(200).json(new ApiResponse(200, "Default address updated", data));
});

export const deleteAddress = asyncHandler(async (req: Request, res: Response) => {
  const data = await AddressService.remove(getUserId(req), req.params.id);
  res.status(200).json(new ApiResponse(200, "Address deleted", data));
});

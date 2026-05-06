import { Request, Response } from "express";
import { ApiResponse, asyncHandler } from "../../shared/utils";
import { CouponService } from "./coupon.service";

export const createCoupon = asyncHandler(async (req: Request, res: Response) => {
  const data = await CouponService.create(req.body);
  res.status(201).json(new ApiResponse(201, "Coupon created", data));
});

export const listCoupons = asyncHandler(async (req: Request, res: Response) => {
  const data = await CouponService.list(req.query);
  res.status(200).json(new ApiResponse(200, "Coupons fetched", data));
});

export const updateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const data = await CouponService.update(req.params.id, req.body);
  res.status(200).json(new ApiResponse(200, "Coupon updated", data));
});

export const deleteCoupon = asyncHandler(async (req: Request, res: Response) => {
  const data = await CouponService.remove(req.params.id);
  res.status(200).json(new ApiResponse(200, "Coupon deleted", data));
});

export const validateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const subtotal = Number(req.query.subtotal || 0);
  const data = await CouponService.validate(req.params.code, subtotal);
  res.status(200).json(new ApiResponse(200, "Coupon validated", data));
});


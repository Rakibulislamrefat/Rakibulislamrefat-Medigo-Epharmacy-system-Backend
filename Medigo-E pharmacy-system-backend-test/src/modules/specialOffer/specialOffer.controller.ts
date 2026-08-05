import { Request, Response } from "express";
import { ApiResponse, asyncHandler } from "../../shared/utils";
import { SpecialOfferService } from "./specialOffer.service";

export const createSpecialOffer = asyncHandler(async (req: Request, res: Response) => {
  const data = await SpecialOfferService.create(req.body);
  res.status(201).json(new ApiResponse(201, "Special offer created", data));
});

export const listSpecialOffers = asyncHandler(async (req: Request, res: Response) => {
  const data = await SpecialOfferService.list(req.query);
  res.status(200).json(new ApiResponse(200, "Special offers fetched", data));
});

export const getSpecialOffer = asyncHandler(async (req: Request, res: Response) => {
  const data = await SpecialOfferService.getById(req.params.id);
  res.status(200).json(new ApiResponse(200, "Special offer fetched", data));
});

export const updateSpecialOffer = asyncHandler(async (req: Request, res: Response) => {
  const data = await SpecialOfferService.update(req.params.id, req.body);
  res.status(200).json(new ApiResponse(200, "Special offer updated", data));
});

export const deleteSpecialOffer = asyncHandler(async (req: Request, res: Response) => {
  const data = await SpecialOfferService.remove(req.params.id);
  res.status(200).json(new ApiResponse(200, "Special offer deleted", data));
});

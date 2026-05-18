import { Request, Response } from "express";
import { ApiResponse, asyncHandler } from "../../shared/utils";
import { RequestOrderService } from "./requestOrder.service";

export const createRequestOrder = asyncHandler(async (req: Request, res: Response) => {
  const payload = {
    ...req.body,
    meta: {
      ip: req.ip,
      userAgent: req.get("User-Agent") || "",
    },
  };

  if (req.file) {
    payload.prescriptionUrl = req.file.path;
  }

  const data = await RequestOrderService.create(payload);
  res.status(201).json(new ApiResponse(201, "Request order created", data));
});

export const listRequestOrders = asyncHandler(async (req: Request, res: Response) => {
  const data = await RequestOrderService.list(req.query);
  res.status(200).json(new ApiResponse(200, "Request orders fetched", data));
});

export const getRequestOrder = asyncHandler(async (req: Request, res: Response) => {
  const data = await RequestOrderService.get(req.params.id);
  res.status(200).json(new ApiResponse(200, "Request order fetched", data));
});

export const updateRequestOrder = asyncHandler(async (req: Request, res: Response) => {
  const payload = { ...req.body };

  if (req.file) {
    payload.prescriptionUrl = req.file.path;
  }

  const data = await RequestOrderService.update(req.params.id, payload);
  res.status(200).json(new ApiResponse(200, "Request order updated", data));
});

export const deleteRequestOrder = asyncHandler(async (req: Request, res: Response) => {
  const data = await RequestOrderService.remove(req.params.id);
  res.status(200).json(new ApiResponse(200, "Request order deleted", data));
});

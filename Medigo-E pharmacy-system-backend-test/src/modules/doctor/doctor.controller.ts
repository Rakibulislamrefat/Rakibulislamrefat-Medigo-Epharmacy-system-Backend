import { Request, Response } from "express";
import { ApiResponse, asyncHandler } from "../../shared/utils";
import { DoctorService } from "./doctor.service";

export const createDoctor = asyncHandler(async (req: Request, res: Response) => {
  const data = await DoctorService.create(req.body);
  res.status(201).json(new ApiResponse(201, "Doctor created", data));
});

export const listDoctors = asyncHandler(async (req: Request, res: Response) => {
  const data = await DoctorService.list(req.query);
  res.status(200).json(new ApiResponse(200, "Doctors fetched", data));
});

export const getDoctor = asyncHandler(async (req: Request, res: Response) => {
  const data = await DoctorService.get(req.params.id);
  res.status(200).json(new ApiResponse(200, "Doctor fetched", data));
});

export const updateDoctor = asyncHandler(async (req: Request, res: Response) => {
  const data = await DoctorService.update(req.params.id, req.body);
  res.status(200).json(new ApiResponse(200, "Doctor updated", data));
});

export const deleteDoctor = asyncHandler(async (req: Request, res: Response) => {
  const data = await DoctorService.remove(req.params.id);
  res.status(200).json(new ApiResponse(200, "Doctor deleted", data));
});


import { Request, Response } from "express";
import { ApiResponse, asyncHandler } from "../../shared/utils";
import { BranchService } from "./branch.service";

export const createBranch = asyncHandler(async (req: Request, res: Response) => {
  const data = await BranchService.create(req.body);
  res.status(201).json(new ApiResponse(201, "Branch created", data));
});

export const listBranches = asyncHandler(async (req: Request, res: Response) => {
  const data = await BranchService.list(req.query);
  res.status(200).json(new ApiResponse(200, "Branches fetched", data));
});

export const updateBranch = asyncHandler(async (req: Request, res: Response) => {
  const data = await BranchService.update(req.params.id, req.body);
  res.status(200).json(new ApiResponse(200, "Branch updated", data));
});

export const deleteBranch = asyncHandler(async (req: Request, res: Response) => {
  const data = await BranchService.remove(req.params.id);
  res.status(200).json(new ApiResponse(200, "Branch deleted", data));
});


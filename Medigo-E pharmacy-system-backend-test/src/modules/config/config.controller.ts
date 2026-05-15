import { Request, Response } from "express";
import frontendConfig from "../../config/frontend";
import { ApiResponse, asyncHandler } from "../../shared/utils";

export const getFrontendConfig = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json(new ApiResponse(200, "Frontend configuration fetched", frontendConfig));
});

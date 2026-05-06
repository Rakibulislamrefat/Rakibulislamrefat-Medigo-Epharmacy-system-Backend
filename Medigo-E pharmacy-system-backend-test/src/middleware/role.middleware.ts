import { Request, Response, NextFunction } from "express";
import { ApiError } from "../shared/utils";

export const authorize = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new ApiError(401, "Not authenticated");
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(
        403,
        `Access denied. Required role: [${roles.join(", ")}]. Your role: ${req.user.role}`
      );
    }

    next();
  };
};

export const requireRole = (...roles: string[]) => authorize(...roles);

import type { Request, Response, NextFunction } from "express";

// Middleware stubs - authentication is handled in routes
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  next();
}

export function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  next();
}

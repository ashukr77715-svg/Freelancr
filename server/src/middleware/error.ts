import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/errors.js";
import { isProd } from "../config/env.js";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "Route not found" });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
  }

  console.error("Unhandled error:", err);
  res.status(500).json({
    error: isProd ? "Something went wrong" : String(err),
  });
}

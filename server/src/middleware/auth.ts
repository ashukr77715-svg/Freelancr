import type { NextFunction, Request, Response } from "express";
import { cookieNames, verifyAccessToken } from "../services/token.service.js";
import { ApiError } from "../utils/errors.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[cookieNames.access];
  if (!token) {
    return next(ApiError.unauthorized("Not authenticated", "NO_TOKEN"));
  }
  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    next();
  } catch (err) {
    next(err);
  }
}

import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";
import { ApiError } from "../utils/errors.js";

export function validateBody(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const first = result.error.issues[0];
      const path = first.path.length ? `${first.path.join(".")}: ` : "";
      return next(ApiError.badRequest(`${path}${first.message}`, "VALIDATION"));
    }
    req.body = result.data;
    next();
  };
}

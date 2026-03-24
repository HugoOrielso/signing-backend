import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  let requestId = req.headers["x-request-id"];

  if (typeof requestId !== "string") {
    requestId = crypto.randomUUID();
  }

  req.headers["x-request-id"] = requestId;

  res.setHeader("x-request-id", requestId);

  next();
}
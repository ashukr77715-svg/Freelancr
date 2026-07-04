import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { Response } from "express";
import { env, isProd } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/errors.js";

const ACCESS_COOKIE = "access_token";
const REFRESH_COOKIE = "refresh_token";
// Refresh cookie is scoped to the auth routes so it isn't sent on every request.
const REFRESH_COOKIE_PATH = "/api/auth";

export interface AccessTokenPayload {
  sub: string; // user id
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function signAccessToken(userId: string): string {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: userId,
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded === "string" || !decoded.sub) {
      throw ApiError.unauthorized("Invalid token", "TOKEN_INVALID");
    }
    return { sub: decoded.sub };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw ApiError.unauthorized("Access token expired", "TOKEN_EXPIRED");
    }
    throw ApiError.unauthorized("Invalid token", "TOKEN_INVALID");
  }
}

export async function issueRefreshToken(
  userId: string,
  userAgent?: string
): Promise<string> {
  const token = crypto.randomBytes(48).toString("base64url");
  const expiresAt = new Date(
    Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  );
  await prisma.refreshToken.create({
    data: { userId, tokenHash: sha256(token), expiresAt, userAgent },
  });
  return token;
}

/**
 * Rotates a refresh token: validates it, revokes it, and issues a new one.
 * If a revoked token is replayed, all sessions for that user are revoked
 * (token theft detection).
 */
export async function rotateRefreshToken(
  token: string,
  userAgent?: string
): Promise<{ userId: string; refreshToken: string }> {
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: sha256(token) },
  });

  if (!record) {
    throw ApiError.unauthorized("Invalid refresh token", "REFRESH_INVALID");
  }

  if (record.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw ApiError.unauthorized("Refresh token reuse detected", "REFRESH_REUSED");
  }

  if (record.expiresAt < new Date()) {
    throw ApiError.unauthorized("Refresh token expired", "REFRESH_EXPIRED");
  }

  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });

  const refreshToken = await issueRefreshToken(record.userId, userAgent);
  return { userId: record.userId, refreshToken };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: sha256(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string
): void {
  res.cookie(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60 * 1000,
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: REFRESH_COOKIE_PATH,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { path: "/" });
  res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
}

export const cookieNames = {
  access: ACCESS_COOKIE,
  refresh: REFRESH_COOKIE,
} as const;

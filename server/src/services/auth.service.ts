import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import type { Plan } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/errors.js";
import { sendPasswordResetEmail } from "./email.service.js";
import { logActivity } from "./activity.service.js";

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  businessName: string | null;
  phone: string | null;
  address: string | null;
  gstin: string | null;
  logoUrl: string | null;
  plan: Plan;
  createdAt: Date;
}

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  businessName: true,
  phone: true,
  address: true,
  gstin: true,
  logoUrl: true,
  plan: true,
  createdAt: true,
} as const;

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function signup(input: {
  name: string;
  email: string;
  password: string;
  businessName?: string;
}): Promise<PublicUser> {
  const email = input.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw ApiError.conflict("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: input.name.trim(),
      businessName: input.businessName?.trim() || null,
    },
    select: publicUserSelect,
  });

  await logActivity({
    userId: user.id,
    type: "account.created",
    message: "Account created",
  });

  return user;
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<PublicUser> {
  const email = input.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });

  // Run bcrypt compare even when the user doesn't exist so response timing
  // doesn't reveal which emails are registered.
  const hash =
    user?.passwordHash ??
    "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
  const valid = await bcrypt.compare(input.password, hash);

  if (!user || !valid) {
    throw ApiError.unauthorized("Invalid email or password", "BAD_CREDENTIALS");
  }

  const { passwordHash: _ph, ...rest } = user;
  return {
    id: rest.id,
    email: rest.email,
    name: rest.name,
    businessName: rest.businessName,
    phone: rest.phone,
    address: rest.address,
    gstin: rest.gstin,
    logoUrl: rest.logoUrl,
    plan: rest.plan,
    createdAt: rest.createdAt,
  };
}

export async function getUserById(id: string): Promise<PublicUser | null> {
  return prisma.user.findUnique({ where: { id }, select: publicUserSelect });
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  // Always behave the same whether or not the account exists.
  if (!user) return;

  const token = crypto.randomBytes(32).toString("base64url");
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${token}`;
  await sendPasswordResetEmail(user.email, resetUrl);
}

export async function resetPassword(input: {
  token: string;
  password: string;
}): Promise<void> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: sha256(input.token) },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw ApiError.badRequest(
      "This reset link is invalid or has expired",
      "RESET_TOKEN_INVALID"
    );
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Changing the password invalidates all existing sessions.
    prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

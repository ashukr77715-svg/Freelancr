import crypto from "node:crypto";
import { Router } from "express";
import bcrypt from "bcryptjs";
import { env, isProd } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { logActivity } from "../services/activity.service.js";
import {
  issueRefreshToken,
  setAuthCookies,
  signAccessToken,
} from "../services/token.service.js";

const router = Router();

const STATE_COOKIE = "g_oauth_state";

export function isGoogleConfigured(): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

function redirectUri(): string {
  return `${env.SERVER_PUBLIC_URL}/api/auth/google/callback`;
}

router.get("/google", (req, res) => {
  if (!isGoogleConfigured()) {
    return res.redirect(`${env.CLIENT_URL}/login?error=google_unconfigured`);
  }
  const state = crypto.randomBytes(16).toString("hex");
  res.cookie(STATE_COOKIE, state, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 10 * 60 * 1000,
  });
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get(
  "/google/callback",
  asyncHandler(async (req, res) => {
    const fail = (reason: string) => {
      console.warn("Google OAuth failed:", reason);
      res.clearCookie(STATE_COOKIE);
      res.redirect(`${env.CLIENT_URL}/login?error=google_failed`);
    };

    const code = req.query.code;
    const state = req.query.state;
    if (
      typeof code !== "string" ||
      typeof state !== "string" ||
      !req.cookies?.[STATE_COOKIE] ||
      state !== req.cookies[STATE_COOKIE]
    ) {
      return fail("missing code or state mismatch");
    }
    res.clearCookie(STATE_COOKIE);

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID!,
        client_secret: env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri(),
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) {
      return fail(`token exchange ${tokenRes.status}: ${await tokenRes.text()}`);
    }
    const { id_token: idToken } = (await tokenRes.json()) as { id_token?: string };
    if (!idToken) return fail("no id_token in response");

    // The id_token arrives directly from Google over TLS in this same
    // exchange, so decoding without signature verification is safe here.
    let profile: { email?: string; email_verified?: boolean; name?: string };
    try {
      profile = JSON.parse(
        Buffer.from(idToken.split(".")[1], "base64url").toString("utf8")
      );
    } catch {
      return fail("could not decode id_token");
    }
    if (!profile.email || profile.email_verified === false) {
      return fail("no verified email in Google profile");
    }

    const email = profile.email.toLowerCase();
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Random password: Google-only accounts can set one via password reset.
      const passwordHash = await bcrypt.hash(
        crypto.randomBytes(32).toString("base64url"),
        12
      );
      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name: profile.name?.trim() || email.split("@")[0],
        },
      });
      await logActivity({
        userId: user.id,
        type: "account.created",
        message: "Account created with Google",
      });
    }

    const accessToken = signAccessToken(user.id);
    const refreshToken = await issueRefreshToken(
      user.id,
      req.get("user-agent") ?? undefined
    );
    setAuthCookies(res, accessToken, refreshToken);
    res.redirect(`${env.CLIENT_URL}/dashboard`);
  })
);

export default router;

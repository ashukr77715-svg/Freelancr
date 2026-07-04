import os from "node:os";
import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

// Local server/.env first, then machine-level secrets kept outside the repo
// (~/.freelancehq/secrets.env) so API keys are never committed with the code.
// dotenv never overrides variables that are already set.
dotenv.config();
dotenv.config({ path: path.join(os.homedir(), ".freelancehq", "secrets.env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),

  CLIENT_URL: z.string().url().default("http://localhost:5173"),

  // Email (optional in dev — falls back to console logging)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default("freelancr <no-reply@localhost>"),

  // Google OAuth (optional — the button activates when these are set)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  // Public base URL of this API server (for the OAuth redirect URI)
  SERVER_PUBLIC_URL: z.string().url().default("http://localhost:4000"),

  ANTHROPIC_API_KEY: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";

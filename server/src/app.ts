import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { env, isProd } from "./config/env.js";
import authRoutes from "./routes/auth.routes.js";
import clientsRoutes from "./routes/clients.routes.js";
import proposalsRoutes from "./routes/proposals.routes.js";
import invoicesRoutes from "./routes/invoices.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import billingRoutes from "./routes/billing.routes.js";
import webhooksRoutes from "./routes/webhooks.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { UPLOADS_DIR } from "./services/storage.service.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    })
  );

  // Webhooks need the raw body for signature verification — mounted before
  // the JSON parser (the route applies express.raw itself).
  app.use("/api/webhooks", webhooksRoutes);

  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.use("/uploads", express.static(UPLOADS_DIR, { maxAge: "1d" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, env: isProd ? "production" : "development" });
  });

  // The API has no UI — send stray browser visits to the app.
  app.get("/", (_req, res) => {
    res.redirect(env.CLIENT_URL);
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/clients", clientsRoutes);
  app.use("/api/proposals", proposalsRoutes);
  app.use("/api/invoices", invoicesRoutes);
  app.use("/api/settings", settingsRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/billing", billingRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

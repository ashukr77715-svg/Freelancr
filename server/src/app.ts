import path from "node:path";
import { fileURLToPath } from "node:url";
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

  // In dev the client runs on its own Vite port; send stray visits there.
  if (!isProd) {
    app.get("/", (_req, res) => {
      res.redirect(env.CLIENT_URL);
    });
  }

  app.use("/api/auth", authRoutes);
  app.use("/api/clients", clientsRoutes);
  app.use("/api/proposals", proposalsRoutes);
  app.use("/api/invoices", invoicesRoutes);
  app.use("/api/settings", settingsRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/billing", billingRoutes);

  // In production this single Node process also serves the built React app,
  // so one deployment hosts the whole site (frontend + API on one origin).
  if (isProd) {
    // Compiled server lives at server/dist/app.js → client build at client/dist
    const dirname = path.dirname(fileURLToPath(import.meta.url));
    const clientDist = path.resolve(dirname, "../../client/dist");

    app.use(express.static(clientDist));

    // Client-side routing: any non-API GET falls back to index.html.
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
        return next();
      }
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

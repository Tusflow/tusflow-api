import { Hono } from "hono";
import type { AppBindings } from "@/types/honoTypes";
import { securityMiddleware, validateFileUpload } from "@/middleware";
import { logger } from "hono/logger";

export function createRouter() {
  return new Hono<AppBindings>({ strict: false });
}

export default function createApp() {
  const app = createRouter();

  app.use(logger());

  // Security middleware
  app.use("*", securityMiddleware);

  // Validate file upload
  app.use("*", validateFileUpload());

  return app;
}

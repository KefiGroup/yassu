import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { createServer } from "http";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupOAuth } from "./oauth";
import { seedDatabase } from "./seed";

const app = express();

// Health check endpoints - MUST respond immediately, no conditions
// These are before ANY other middleware
app.head("/", (_req, res) => res.sendStatus(200));
app.head("/health", (_req, res) => res.sendStatus(200));
app.get("/health", (_req, res) => res.status(200).send("OK"));
// Root GET - serve minimal HTML that loads the SPA (for health checks AND users)
app.get("/", (_req, res) => {
  // In development, let Vite handle it
  if (process.env.NODE_ENV !== "production") {
    return res.status(200).send("OK");
  }
  // In production, redirect to let catch-all serve SPA
  // Health checks get 200, browsers follow redirect
  res.status(200).send(`<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=/home"><title>Yassu</title></head><body></body></html>`);
});

// Trust reverse proxy in production (required for secure cookies behind Replit's proxy)
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "unicorn-founders-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// OAuth disabled - uncomment when ready to enable social sign-in
// setupOAuth(app);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Register routes synchronously
registerRoutes(app);
const server = createServer(app);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({ message });
  throw err;
});

// Setup static serving or Vite
if (process.env.NODE_ENV === "production") {
  serveStatic(app);
} else {
  setupVite(app, server);
}

const port = 5000;
server.listen(
  {
    port,
    host: "0.0.0.0",
    reusePort: true,
  },
  () => {
    log(`serving on port ${port}`);
    // Seed database AFTER server is listening
    seedDatabase().catch(err => console.error("Database seeding error:", err));
  }
);

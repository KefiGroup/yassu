import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { createServer } from "http";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedDatabase } from "./seed";

// Readiness flag - server responds OK until fully ready
let isReady = false;

const app = express();
const server = createServer(app);

// Health check endpoints - ALWAYS return OK immediately until ready
// After ready, browser requests fall through to SPA
app.head("/", (_req, res) => res.sendStatus(200));
app.head("/health", (_req, res) => res.sendStatus(200));
app.get("/health", (_req, res) => res.status(200).type("text/plain").send("OK"));
app.get("/", (_req, res, next) => {
  // Until ready, always return plain OK (for health checks during startup)
  if (!isReady) {
    return res.status(200).type("text/plain").send("OK");
  }
  // Once ready, let browser requests through to SPA
  next();
});

// Trust reverse proxy in production
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

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
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

// Register API routes
registerRoutes(app);

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  throw err;
});

// Bootstrap function - complete all setup before listening
async function bootstrap() {
  // Seed database BEFORE listening
  try {
    await seedDatabase();
  } catch (err) {
    console.error("Database seeding error (continuing):", err);
  }

  // Setup static/Vite
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    await setupVite(app, server);
  }

  // Start listening - server is now fully ready
  const port = 5000;
  server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    log(`serving on port ${port}`);
    // Mark as ready - now SPA requests will be served
    isReady = true;
    log("Server is ready");
  });
}

bootstrap().catch(err => {
  console.error("Bootstrap failed:", err);
  process.exit(1);
});

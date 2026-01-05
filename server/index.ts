import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import pgSession from "connect-pg-simple";
import { Pool } from "pg";
import { createServer } from "http";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedDatabase } from "./seed";
import { ensureTables } from "./ensure-tables";
import { setupOAuth } from "./oauth";

const app = express();
const server = createServer(app);

// Create PostgreSQL pool for session store
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const PgStore = pgSession(session);

// Health check endpoints - ALWAYS return 200 immediately, no conditions
app.head("/", (_req, res) => res.sendStatus(200));
app.head("/health", (_req, res) => res.sendStatus(200));
app.get("/health", (_req, res) => res.status(200).type("text/plain").send("OK"));

// Trust reverse proxy in production
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use(
  session({
    store: new PgStore({
      pool: pgPool,
      tableName: 'session',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "unicorn-founders-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Temporarily disable for debugging
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    },
  })
);

// Setup OAuth (Google, Apple)
setupOAuth(app);

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

// Register API routes FIRST
registerRoutes(app);

// Setup static/Vite (SPA serving) - this includes catch-all for /
if (process.env.NODE_ENV === "production") {
  serveStatic(app);
}

// Error handler LAST (after all routes and static serving)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  console.error(err);
});

// Start listening
const port = 5000;
server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
  log(`serving on port ${port}`);
  
  // In development, setup Vite after listening
  if (process.env.NODE_ENV !== "production") {
    setupVite(app, server).catch(err => console.error("Vite setup error:", err));
  }
  
  // Ensure tables exist before seeding
  void ensureTables()
    .then(() => seedDatabase())
    .catch(err => console.error("Database setup error:", err));
  
  console.log("OAuth providers configured:");
  console.log("  Google:", !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET));
  console.log("  Apple:", !!(process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID));
});

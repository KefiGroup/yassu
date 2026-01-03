import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { createServer } from "http";
import path from "path";

const app = express();
const server = createServer(app);

// Health check endpoints - MUST be first, before ANY imports or middleware
app.head("/", (_req, res) => res.sendStatus(200));
app.head("/health", (_req, res) => res.sendStatus(200));
app.get("/health", (_req, res) => res.status(200).send("OK"));
app.get("/", (_req, res) => {
  if (process.env.NODE_ENV !== "production") {
    return res.status(200).send("OK");
  }
  res.status(200).send(`<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=/home"><title>Yassu</title></head><body></body></html>`);
});

// Start listening IMMEDIATELY - before any other setup
const port = 5000;
server.listen({ port, host: "0.0.0.0", reusePort: true }, async () => {
  console.log(`Server listening on port ${port}`);
  
  // Now do the rest of the setup
  try {
    // Dynamic imports to avoid blocking startup
    const { registerRoutes } = await import("./routes");
    const { setupVite, serveStatic, log } = await import("./vite");
    const { seedDatabase } = await import("./seed");
    
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

    registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      throw err;
    });

    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      await setupVite(app, server);
    }

    log(`serving on port ${port}`);
    
    // Seed database last
    seedDatabase().catch(err => console.error("Database seeding error:", err));
  } catch (err) {
    console.error("Server setup error:", err);
  }
});

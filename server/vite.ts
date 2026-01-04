import type { Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";

// Get directory path - works in both ESM and CommonJS bundled code
function getDirname(): string {
  // In production (CommonJS bundle), use process.cwd()
  // In development (ESM), this file is in the server directory
  try {
    // Check if we're in the bundled dist directory
    if (fs.existsSync(path.join(process.cwd(), 'dist', 'index.cjs'))) {
      return path.join(process.cwd(), 'dist');
    }
  } catch {
    // Fallback
  }
  return path.join(process.cwd(), 'server');
}

const __dirname = getDirname();

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: any) {
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    appType: "custom",
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
      },
    },
  });

  app.use(vite.middlewares);
  app.use("/{*splat}", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(__dirname, "..", "index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // In production, dist/public is always at process.cwd()/dist/public
  const distPath = path.resolve(process.cwd(), "dist", "public");

  console.log(`[serveStatic] Looking for dist at: ${distPath}`);
  console.log(`[serveStatic] Exists: ${fs.existsSync(distPath)}`);

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(
    require("express").static(distPath, {
      index: false,
    }),
  );

  // Catch-all: serve index.html for any route not matched above
  app.use((_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

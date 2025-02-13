import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

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

(async () => {
  try {
    console.log('Starting server initialization...');
    const server = registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Error in middleware:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
    });

    if (app.get("env") === "development") {
      console.log('Setting up Vite for development...');
      await setupVite(app, server);
    } else {
      console.log('Setting up static serving for production...');
      serveStatic(app);
    }

    // Try port 5000 first, then try port 5001
    const tryPort = async (port: number): Promise<void> => {
      return new Promise((resolve, reject) => {
        console.log(`Attempting to start server on port ${port}...`);

        const onError = (err: any) => {
          if (err?.code === 'EADDRINUSE') {
            console.log(`Port ${port} is in use`);
            if (port === 5000) {
              console.log('Trying alternative port 5001...');
              tryPort(5001).then(resolve).catch(reject);
            } else {
              reject(new Error(`Both ports 5000 and 5001 are in use. Please try restarting the server.`));
            }
          } else {
            console.error(`Failed to start server on port ${port}:`, err);
            reject(err);
          }
        };

        server.once('error', onError);

        server.listen(port, "0.0.0.0", () => {
          server.removeListener('error', onError);
          console.log(`Server successfully started on port ${port}`);
          log(`serving on port ${port}`);
          resolve();
        });
      });
    };

    await tryPort(5000);
    console.log('Server startup completed successfully');
  } catch (error) {
    console.error('Fatal error during server startup:', error);
    process.exit(1);
  }
})();
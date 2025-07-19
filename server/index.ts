import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pool } from "./db";
// لا نستخدم connectPgSimple مع VS Code
// import connectPgSimple from "connect-pg-simple"; 
import createMemoryStore from 'memorystore';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// استخدام خيار التخزين في الذاكرة بدلاً من PostgreSQL للجلسات
// هذا يحل مشكلة الاتصال في VS Code المحلي
const MemoryStore = createMemoryStore(session);

app.use(
  session({
    // استخدام تخزين الذاكرة بدلاً من قاعدة البيانات للمقاطع
    store: new MemoryStore({
      checkPeriod: 86400000 // التنظيف كل 24 ساعة
    }),
    secret: process.env.SESSION_SECRET || "your-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { 
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: process.env.NODE_ENV === "production"
    }
  })
);

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
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // من المهم إعداد Vite فقط أثناء التطوير وبعده
  // إعداد جميع المسارات الأخرى بحيث يكون المسار الشامل
  // لا يتداخل مع المسارات الأخرى
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 8080
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
  });
})();


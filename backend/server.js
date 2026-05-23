const { webcrypto } = require("crypto");
if (!globalThis.crypto) globalThis.crypto = webcrypto;

require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const morgan = require("morgan");
const connectDB = require("./config/db");

const app = express();
const isProduction = process.env.NODE_ENV === "production";

// Connect to MongoDB
connectDB();

// --------------- Security Middleware ---------------

// Set security HTTP headers. In production we also serve the SPA from this
// process, so relax CSP / CORP to let the bundled JS/CSS/images load.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Request logging
app.use(morgan("dev"));

// CORS - only allow frontend origin
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000").split(",");
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc in dev)
      if (!origin && process.env.NODE_ENV !== "production") return callback(null, true);
      if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"],
  })
);

// Body parser with size limit to prevent large payload attacks
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Global rate limiter - 1000 requests per 15 minutes per IP.
// Bumped up from 100 to accommodate the employee dashboard's polling
// (auto-refresh hits 2 GET endpoints every 15s while the page is open).
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", globalLimiter);

// Stricter rate limit for booking creation only (prevent spam bookings)
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many booking attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/appointments", (req, res, next) => {
  // Only POST creates new bookings — read/cancel use the global limiter
  if (req.method === "POST" && req.path === "/") return bookingLimiter(req, res, next);
  next();
});

// --------------- Routes ---------------

// Root route - API info page (only in dev; in production the SPA owns `/`)
app.get("/api", (req, res) => {
  res.json({
    name: "Government Booking System API",
    version: "1.0.0",
    status: "running",
    endpoints: {
      health: "GET /api/health",
      register: "POST /api/auth/register",
      login: "POST /api/auth/login",
      sendOtp: "POST /api/auth/sendOtp",
      resetPassword: "POST /api/auth/resetpassword",
      services: "GET /api/services",
      branches: "GET /api/branches?serviceId=ID",
      slots: "GET /api/slots?branchId=ID",
      createAppointment: "POST /api/appointments",
      userAppointments: "GET /api/appointments/user?nationalId=NID",
      appointmentByRef: "GET /api/appointments/reference/:ref",
      cancelAppointment: "PUT /api/appointments/:id/cancel",
      todayAppointments: "GET /api/appointments/today?branchId=ID",
      verifyQR: "POST /api/appointments/verify-qr",
      updateStatus: "PUT /api/appointments/:id/status",
      employeeProfile: "GET /api/employees/:id",
    },
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/services", require("./routes/services"));
app.use("/api/branches", require("./routes/branches"));
app.use("/api/slots", require("./routes/slots"));
app.use("/api/appointments", require("./routes/appointments"));
app.use("/api/employees", require("./routes/employees"));

// --------------- Static frontend (production) ---------------
// Serve the built Vite SPA from frontend/dist and fall back to index.html
// for client-side routing. Skipped in dev where Vite runs separately.
const FRONTEND_DIST = path.resolve(__dirname, "..", "frontend", "dist");
if (isProduction && fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));

  app.get(/^(?!\/api).*/, (req, res, next) => {
    if (req.method !== "GET") return next();
    res.sendFile(path.join(FRONTEND_DIST, "index.html"));
  });
}

// --------------- Error Handling ---------------

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err.message);

  // CORS error
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ success: false, message: "CORS: Origin not allowed" });
  }

  // JSON parse error
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "Invalid JSON in request body" });
  }

  // Payload too large
  if (err.type === "entity.too.large") {
    return res.status(413).json({ success: false, message: "Request body too large" });
  }

  // Don't leak error details in production
  const message =
    process.env.NODE_ENV === "production" ? "Internal server error" : err.message;

  res.status(err.status || 500).json({ success: false, message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (${process.env.NODE_ENV || "development"})`);
});

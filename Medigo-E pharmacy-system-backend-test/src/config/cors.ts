import cors, { CorsOptions } from "cors";
import { ApiError }          from "../shared/utils/ApiError";

// ── Allowed origins ────────────────────────────────────
const rawOrigins =
  process.env.CLIENT_URLS ||
  process.env.CLIENT_URL ||
  "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177,http://localhost:3000";

const allowedOrigins: string[] = rawOrigins
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions: CorsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    // Allow requests with no browser origin, and payment/browser redirects that
    // send the literal "null" origin.
    if (!origin || origin === "null") {
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new ApiError(403, `CORS: Origin "${origin}" is not allowed`));
    }
  },

  credentials:     true,   // allow cookies (refreshToken)
  methods:         ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders:  ["Content-Type", "Authorization"],
  exposedHeaders:  ["X-Total-Count"],  // useful for pagination headers
  maxAge:          86400,              // preflight cache: 24 hours
};

export default cors(corsOptions);

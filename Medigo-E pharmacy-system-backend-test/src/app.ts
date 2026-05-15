import express from "express";
import corsMiddleware from "./config/cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import router from "./routes";
import orderRoutes from "./routes/orders";
import { protect as requireAuth } from "./middleware/auth.middleware";
import { errorHandler } from "./middleware";

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(corsMiddleware);
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use("/api/v1/orders", requireAuth, orderRoutes);
app.use("/api/v1", router);
app.use(errorHandler);


app.get("/", (req, res) => {
  res
    .status(200)
    .type("html")
    .send(
      `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Medigo E-Pharmacy Backend</title>
  </head>
  <body>
    <h2>Medigo E-Pharmacy API is running</h2>
    <ul>
      <li><a href="/health">Health</a></li>
      <li><code>/api/v1</code></li>
    </ul>
  </body>
</html>`,
    );
});


// ── Health route ───────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({
    status:    "ok",
    message:   "Medigo E-Pharmacy API is healthy",
    timestamp: new Date().toISOString(),
    uptime:    `${Math.floor(process.uptime())}s`,
  });
});

export default app;

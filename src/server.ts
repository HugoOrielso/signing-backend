import express, { Request, Response, NextFunction } from "express";
import cors, { CorsOptions } from "cors";
import authRouter from "./routes/auth.route";
import contractsRouter from "./routes/contract.routes";
import { requestIdMiddleware } from "./middleware/requestMiddleware";

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "https://theaceous-indorsable-lilliana.ngrok-free.dev",
];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin no permitido: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.use(requestIdMiddleware);

// Routesa
app.get("/", (_req: Request, res: Response) => {
  return res.status(200).json("ok")
})
app.use("/api/auth", authRouter);
app.use("/api/contracts", contractsRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ error: message });
});

export default app;
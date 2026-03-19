import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import authRouter from "./routes/auth.route";
import contractsRouter from "./routes/contract.routes";

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Routes
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
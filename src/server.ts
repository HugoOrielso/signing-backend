import express, { Request, Response, NextFunction } from "express";
import cors, { CorsOptions } from "cors";
import authRouter from "./routes/auth.route";
import contractsRouter from "./routes/contract.routes";
import { requestIdMiddleware } from "./middleware/requestMiddleware";
import cookieParser from "cookie-parser";
import userRouter from "./routes/user.routes";
import veriffRouter from "./routes/veriff.route";
import adminRouter from "./routes/admin.route";
import { signLibranzaPrueba } from "./controllers/contracts/client/SignPublicContract/signPublicContract.controller";

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "https://dimcultura.com",
  "https://www.dimcultura.com",
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
app.set("trust proxy", true);
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(cookieParser());
app.use("/api/veriff", veriffRouter);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.use(requestIdMiddleware);

app.get("/", (_req: Request, res: Response) => {
  return res.status(200).json("ok")
})
// donde tengas tus rutas principales

app.get("/api/test-masiv", async (req, res) => {
  try {
    const USER = process.env.MASIV_USER;
    const PASSWORD = process.env.MASIV_PASSWORD;

    const auth = Buffer.from(`${USER}:${PASSWORD}`).toString("base64");

    const response = await fetch("https://api-sms.masivapp.com/send-message", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: "573001112233",
        text: "Prueba desde VPS Dimcultura",
      }),
    });

    const text = await response.text();

    return res.status(response.status).send({
      ok: response.ok,
      status: response.status,
      response: text,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error probando Masiv",
      error: error instanceof Error ? error.message : error,
    });
  }
});
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/contracts", contractsRouter);
app.use("/api/users", userRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ error: message });
});

export default app;
import express, { Request, Response, NextFunction } from "express";
import cors, { CorsOptions } from "cors";
import authRouter from "./routes/auth.route";
import contractsRouter from "./routes/contract.routes";
import { requestIdMiddleware } from "./middleware/requestMiddleware";
import cookieParser from "cookie-parser";
import userRouter from "./routes/user.routes";
import veriffRouter from "./routes/veriff.route";
import adminRouter from "./routes/admin.route";
import staffRouter from "./routes/operator.route";
import productsRouter from "./routes/products.route";
import fs from "node:fs";
import path from "node:path";
const app = express();

const allowedOrigins = (
  process.env.ALLOWED_ORIGINS || ""
)
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Permitir Postman, apps móviles y llamadas server-to-server
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(
      new Error(`Origin no permitido: ${origin}`)
    );
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
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/staff", staffRouter);
app.use("/api/contracts", contractsRouter);
app.use("/api/users", userRouter);
app.use("/api/products", productsRouter);


function checkAssets() {
  const requiredFiles = [
    "logo_dimcultura.png",
    "gruculcol.png",
  ];

  const possibleDirs = [
    path.join(process.cwd(), "src", "public"),
    path.join(process.cwd(), "public"),
  ];

  console.log("🔍 Verificando assets...");

  for (const file of requiredFiles) {
    let found = false;

    for (const dir of possibleDirs) {
      const fullPath = path.join(dir, file);

      if (fs.existsSync(fullPath)) {
        console.log(`✅ ${file}: ${fullPath}`);
        found = true;
        break;
      }
    }

    if (!found) {
      console.error(`❌ No encontrado: ${file}`);
    }
  }

  console.log("✅ Verificación de assets finalizada");
}

checkAssets()

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ error: message });
});

export default app;
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import chatRouter from "./routes/chat.js";

const app = express();

app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

const allowed = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowed.length === 0 || allowed.includes(origin)) return cb(null, true);
    return cb(new Error("CORS blocked: " + origin));
  }
}));

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/chat", chatRouter);

export default app;

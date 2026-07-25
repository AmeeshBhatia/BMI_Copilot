import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { generateFullReport } from "./lib/gemini.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/research", async (req, res) => {
  const companyName = (req.body?.companyName || "").trim();

  if (!companyName) {
    return res.status(400).json({ error: "companyName is required." });
  }

  try {
    const report = await generateFullReport(companyName);
    res.json({ report });
  } catch (err) {
    console.error("Report generation failed:", err);
    const message = err?.message || "Unknown error generating report.";
    const status = message.includes("GEMINI_API_KEY") ? 500 : 502;
    res.status(status).json({ error: message });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, hasApiKey: Boolean(process.env.GEMINI_API_KEY) });
});

const PORT = process.env.PORT || 3000;
// Bind to 0.0.0.0 so the app is reachable from other machines (LAN) and works
// on cloud hosts (Render, Railway, etc.) which require binding to all interfaces.
app.listen(PORT, "0.0.0.0", () => {
  console.log(`BMI Copilot running on port ${PORT}`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Network: http://<this-machine-ip>:${PORT}  (for other devices on your Wi-Fi)`);
});

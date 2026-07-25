// Vercel serverless function for POST /api/research.
// (Local dev still uses server.js / Express; this file is what runs on Vercel.)
import { generateFullReport } from "../lib/gemini.js";

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  return await new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try { resolve(JSON.parse(data || "{}")); } catch { resolve({}); }
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const body = await readBody(req);
  const companyName = (body?.companyName || "").trim();
  if (!companyName) {
    res.status(400).json({ error: "companyName is required." });
    return;
  }

  try {
    const report = await generateFullReport(companyName);
    res.status(200).json({ report });
  } catch (err) {
    console.error("Report generation failed:", err);
    res.status(500).json({ error: err?.message || "Unknown error generating report." });
  }
}

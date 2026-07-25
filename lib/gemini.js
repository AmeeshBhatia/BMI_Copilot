import { GoogleGenAI } from "@google/genai";
import { reportSchema } from "./schema.js";
import { researchWithTavily } from "./search.js";

// Flash-Lite is fast and comfortably fits Vercel's 60s function limit.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

// Grounding with Google Search has its own (tighter) free-tier quota. If it is
// off or exhausted, we fall back to the model's own knowledge so the app still
// works. Set ENABLE_GROUNDING=false in .env to skip search entirely.
const ENABLE_GROUNDING = String(process.env.ENABLE_GROUNDING ?? "true").toLowerCase() !== "false";

function isQuotaError(err) {
  const msg = String(err?.message || err || "");
  return err?.status === 429 || /RESOURCE_EXHAUSTED|quota|429/i.test(msg);
}

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Copy .env.example to .env and add your free Gemini API key from https://aistudio.google.com/apikey"
    );
  }
  return new GoogleGenAI({ apiKey });
}

const RESEARCH_SECTIONS = [
  "company identity: full legal name and any DBAs/associated brands, correct pronunciation and common abbreviations, brand identity (logo, tagline, brand voice), official website and social media links (LinkedIn, X/Twitter, Instagram), headquarters and key regional locations, founding year and years in business, employee count and company-size category, legal structure (public/private/non-profit, ticker if public), organizational structure (hierarchy, key departments, named leadership)",
  "what the company does, its history and how the business model works",
  "primary customer segments and what each buys",
  "how the company makes money (all revenue streams, primary vs secondary)",
  "products and services offered",
  "how it operates end-to-end from customer acquisition to delivery (value chain)",
  "key operational processes (sales, onboarding, delivery, billing, support, compliance)",
  "the KPIs this type of business is measured on, and performance if disclosed",
  "challenges facing the whole industry right now",
  "challenges, risks, or controversies specific to this company",
  "strengths, weaknesses, opportunities, and threats",
  "culture and values: mission and vision, core values, work culture, corporate social responsibility",
  "key partnerships, alliances, and joint ventures",
  "financials: revenue or analyst estimates, funding/investments/M&A/IPOs, any financial difficulties",
  "recent news, announcements, earnings, leadership changes, or strategic shifts in the last 6-12 months"
];

/**
 * Stage 1: Use Gemini with Google Search grounding to gather real, current,
 * cited research about the company across every dimension the report needs.
 * Returns the raw grounded text plus the list of source citations.
 */
export async function groundedResearch(companyName, { useGrounding = true } = {}) {
  const ai = getClient();

  const searchLine = useGrounding
    ? "Research this company thoroughly using web search and produce detailed, factual notes"
    : "Using your own knowledge (no web search is available), produce detailed, factual notes";

  const prompt = `You are a senior management consultant preparing for a first discovery
meeting with a new client: "${companyName}".

${searchLine}
(not a polished report yet - just organized research notes) covering each of the
following areas. Be specific: use real numbers, dates, and names where you find them,
and note when information is estimated or not publicly disclosed rather than inventing it.

Areas to research:
${RESEARCH_SECTIONS.map((s, i) => `${i + 1}. ${s}`).join("\n")}

If "${companyName}" is ambiguous or you cannot find a real company by this name,
say so explicitly and research the closest plausible real match, noting the assumption.`;

  const config = useGrounding ? { tools: [{ googleSearch: {} }] } : {};

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config
  });

  const text = response.text || "";

  // Collect citation URLs from grounding metadata if present.
  const sources = [];
  const candidates = response.candidates || [];
  for (const candidate of candidates) {
    const chunks = candidate?.groundingMetadata?.groundingChunks || [];
    for (const chunk of chunks) {
      if (chunk?.web?.uri) {
        sources.push({
          title: chunk.web.title || chunk.web.uri,
          url: chunk.web.uri
        });
      }
    }
  }

  return { researchNotes: text, sources };
}

/**
 * Stage 2: Convert the raw grounded research notes into the strict, structured
 * 20-section JSON report shape defined in schema.js.
 */
export async function synthesizeReport(companyName, researchNotes) {
  const ai = getClient();

  const prompt = `Using ONLY the research notes below about "${companyName}", produce a
consultant-ready business briefing. Write it the way an experienced management
consultant would explain the business to a colleague before a client meeting:
plain English, specific, and practical. Do not just restate marketing copy from
the company's own website - explain how the business actually works.

IMPORTANT: fill in EVERY field with a substantive, useful answer. Where the
research notes are thin, use your own industry knowledge to give a reasonable,
specific answer rather than writing "not available" or "unknown". Only for a
hard, specific fact you truly cannot determine (like an exact private revenue
figure) may you note it's an estimate or not disclosed — but still give your best
informed estimate. Do not fabricate precise numbers that weren't in the notes,
but never leave a field blank or answer "not available".

RESEARCH NOTES:
"""
${researchNotes}
"""

Produce the report as JSON matching the required schema.`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: reportSchema
    }
  });

  const jsonText = response.text;
  return JSON.parse(jsonText);
}

export async function generateFullReport(companyName) {
  let researchNotes;
  let sources = [];
  let grounded = false;

  // Stage 1: research. Provider preference:
  //   1. Tavily (free, live, cited) if TAVILY_API_KEY is set  ← recommended
  //   2. Gemini Google Search grounding if enabled (needs Google billing)
  //   3. Model's own knowledge (always works, but not live / no sources)
  const hasTavily = Boolean(process.env.TAVILY_API_KEY);

  if (hasTavily) {
    try {
      const res = await researchWithTavily(companyName);
      researchNotes = res.researchNotes;
      sources = res.sources;
      grounded = true;
    } catch (err) {
      console.warn("Tavily search failed — falling back to model knowledge:", err.message);
    }
  }

  if (researchNotes === undefined && ENABLE_GROUNDING) {
    try {
      const res = await groundedResearch(companyName, { useGrounding: true });
      researchNotes = res.researchNotes;
      sources = res.sources;
      grounded = true;
    } catch (err) {
      if (!isQuotaError(err)) throw err;
      console.warn("Google Search grounding quota hit — falling back to model knowledge (no live web sources).");
    }
  }

  if (researchNotes === undefined) {
    const res = await groundedResearch(companyName, { useGrounding: false });
    researchNotes = res.researchNotes;
    grounded = false;
  }

  // Stage 2: synthesis into the structured report.
  const report = await synthesizeReport(companyName, researchNotes);
  report.sources = dedupeSources(sources);
  report.grounded = grounded;
  return report;
}

function dedupeSources(sources) {
  const seen = new Set();
  const out = [];
  for (const s of sources) {
    if (!seen.has(s.url)) {
      seen.add(s.url);
      out.push(s);
    }
  }
  return out;
}

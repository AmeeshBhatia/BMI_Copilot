# BMI Copilot — Business Model Intelligence Copilot

Enter any company name and get a consultant-ready business briefing: business
model, revenue streams, customer segments, KPIs, SWOT, competitors, AI/analytics/
Salesforce opportunities, discovery questions, and recent news — all in one page.

Research is done live with Google's Gemini API (free tier), grounded in real
Google Search results, then synthesized into the 20-section report format.

## How it works

1. You type a company name.
2. The backend asks Gemini (with Google Search grounding turned on) to research
   the company across every dimension the report needs, citing real sources.
3. The backend asks Gemini a second time to turn those research notes into a
   strict JSON structure (schema in `lib/schema.js`).
4. The frontend renders that JSON as the full 20-section report.

## 1. Get a free Gemini API key

1. Go to https://aistudio.google.com/apikey
2. Sign in with a Google account and click "Create API key."
3. Copy the key — Gemini's free tier is enough for the report writing.

## 1b. (Recommended) Get a free Tavily key for LIVE, cited reports

Gemini's own Google Search grounding now needs paid billing. To get live,
sourced reports for **free**, use Tavily (a free AI search API — 1,000
searches/month, no credit card):

1. Sign up at https://app.tavily.com
2. Copy your API key.
3. Paste it into `.env` as `TAVILY_API_KEY=...`

When a Tavily key is present, the app uses Tavily for live web research +
real source URLs, and Gemini only writes the report. Without it, reports fall
back to Gemini's own knowledge (works, but not live and no sources).

## 2. Run it locally

```bash
cd bmi-copilot
npm install
cp .env.example .env
# open .env and paste your keys:
#   GEMINI_API_KEY=...   (required, for writing the report)
#   TAVILY_API_KEY=...   (recommended, for free live + cited research)
npm start
```

Open http://localhost:3000, type a company name, click **Generate Briefing**.

A report typically takes 20-60 seconds (two model calls: research, then
synthesis).

## 3. Configuration

All config lives in `.env` (see `.env.example`):

| Variable | Purpose | Default |
|---|---|---|
| `GEMINI_API_KEY` | Your Gemini API key (required) | — |
| `TAVILY_API_KEY` | Free Tavily search key (recommended, for live + cited data) | — |
| `GEMINI_MODEL` | Which Gemini model to use | `gemini-3.5-flash` |
| `ENABLE_GROUNDING` | Use Gemini's own Google Search (needs Google billing) if no Tavily key | `true` |
| `PORT` | Local server port | `3000` |

## 4. Project structure

```
bmi-copilot/
├── server.js            Express app, exposes POST /api/research
├── lib/
│   ├── gemini.js         Two-stage Gemini call: grounded research → structured JSON
│   └── schema.js         JSON Schema for the full 20-section report
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js            Fetches the report and renders every section
├── .env.example
└── package.json
```

## 5. Deploying it (for later)

This is a standard Node/Express app with no database, so it deploys anywhere
that runs Node:

**Render / Railway** (simplest — free tiers available)
1. Push this folder to a GitHub repo.
2. Create a new Web Service from the repo.
3. Build command: `npm install` — Start command: `npm start`.
4. Add an environment variable `GEMINI_API_KEY` with your key in the dashboard.

**Vercel**
Works too, but Vercel's serverless functions have a default timeout that may be
shorter than the ~30-60s a full report can take — increase the function
timeout (or split research/synthesis into two API routes) if you see timeouts.

**Any VPS (e.g. a $5 droplet)**
```bash
git clone <your-repo>
cd bmi-copilot
npm install
echo "GEMINI_API_KEY=..." > .env
npm install -g pm2
pm2 start server.js --name bmi-copilot
```

Whichever host you choose, only `GEMINI_API_KEY` needs to be set as a secret —
never commit `.env` to git (already covered by `.gitignore`).

## 6. Extending it

- **Multi-company comparison / benchmarking**: add a second input and run
  `generateFullReport` for each, then diff the JSON client-side.
- **Export to PDF/PPTX**: the report is already a clean JSON object in
  `renderReport()` — feed it to a doc-generation library instead of (or in
  addition to) the HTML view.
- **Caching**: reports are regenerated on every request. For repeat lookups,
  cache `report` by `companyName` (e.g. in-memory Map, or Redis for production)
  to save API calls.
- **Swap models**: change `GEMINI_MODEL` in `.env` to any Gemini model that
  supports both Google Search grounding and structured output (see
  https://ai.google.dev/gemini-api/docs/structured-output for the current list).

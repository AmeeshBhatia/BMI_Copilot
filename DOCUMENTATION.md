# BMI Copilot — How It Works & Where the Data Comes From

This document explains, in plain terms, exactly how the Business Model
Intelligence Copilot produces a briefing for a company: what data sources it
uses, how a request flows through the system, what is factual vs. inferred, and
the limits you should be aware of before relying on a report.

---

## 1. The short answer: where the data comes from

The app does **not** have its own database of companies. It has no stored
company profiles, no scraped websites, and no pre-written reports. Every
briefing is generated fresh, on demand, from two things:

1. **Live public web results, via Google Search** — pulled at the moment you
   click "Generate Briefing," through Google's Gemini API "Grounding with
   Google Search" feature. This is the primary source: company websites, news
   articles, press releases, financial coverage, and other public pages that
   Google Search surfaces for the company.

2. **The Gemini model's own trained knowledge** — used to organize, interpret,
   and explain what the search results say, and to fill in industry-standard
   context (typical KPIs for the sector, common processes, etc.). This is also
   the **fallback** source: if live search is unavailable or its quota is
   exhausted, the app generates the report from the model's knowledge alone.

There is **no other source**. The app does not read your internal files, your
CRM, or any private data. Everything is either public web content or the
model's general knowledge.

---

## 2. The data pipeline, step by step

When you enter a company name and submit, here is the exact sequence:

```
Browser (public/app.js)
   │  POST /api/research  { companyName }
   ▼
Server (server.js)
   │  calls generateFullReport(companyName)
   ▼
lib/gemini.js  ── STAGE 1: RESEARCH ───────────────────────────────
   │  Sends the company name + a "research brief" prompt to Gemini
   │  WITH the Google Search tool enabled.
   │  Gemini decides what to search, runs multiple Google searches,
   │  reads the results, and returns detailed research notes PLUS a
   │  list of the source URLs it used (grounding citations).
   │
   │  If this call fails because the search quota is exhausted (429),
   │  the app automatically retries WITHOUT search, using only the
   │  model's own knowledge, and marks the report as "not grounded."
   ▼
lib/gemini.js  ── STAGE 2: SYNTHESIS ──────────────────────────────
   │  Sends the research notes back to Gemini with a strict JSON
   │  schema (lib/schema.js) describing the 20-section report.
   │  Gemini returns a single JSON object that exactly matches the
   │  schema — nothing more, nothing less.
   ▼
Server → Browser
   │  { report: { ...20 sections..., sources: [...], grounded: true/false } }
   ▼
Browser (public/app.js)
   │  renderReport() turns the JSON into the on-screen briefing,
   │  including a Sources list and a warning banner if not grounded.
```

### Why two stages instead of one?

Splitting "research" from "formatting" produces noticeably better results:

- **Stage 1** is free to search the web, follow leads, and gather messy,
  detailed notes without worrying about structure.
- **Stage 2** is free to focus purely on explaining the business clearly and
  fitting everything into the exact 20-section format, without getting
  distracted by searching.

This mirrors how a consultant actually works: gather everything first, then
write the briefing.

---

## 3. What each of the 20 sections is built from

| Section | Primary source | Notes |
|---|---|---|
| 1. Executive Summary | Search + model synthesis | Condensed from all research |
| 2. Company Overview | Search (facts: HQ, founded, employees, etc.) | Factual fields; unknowns marked as such |
| 3. Business Model | Search + model interpretation | How the business actually works |
| 4. Revenue Model | Search (disclosed streams) + model | "Primary/Secondary/Emerging" is a model judgment |
| 5. Customer Segments | Search + model | |
| 6. Products & Services | Search (mostly from company's own site) | |
| 7. Value Chain | Model (industry-standard) + search | Often generalized for the sector |
| 8. Key Business Processes | Model (industry-standard) + search | Often generalized for the sector |
| 9. Business KPIs | Model (sector norms) + search (actuals if disclosed) | Formulas/benchmarks are standard industry metrics |
| 10. Industry Challenges | Search + model | Sector-wide, not company-specific |
| 11. Company-Specific Challenges | Search (recent news/filings) | Most time-sensitive; depends on live search |
| 12. SWOT | Model analysis of research | Analytical, not a quoted fact |
| 13. AI Opportunities | Model recommendations | Advisory, not sourced facts |
| 14. Analytics Opportunities | Model recommendations | Advisory, not sourced facts |
| 15. Salesforce Opportunities | Model recommendations | Advisory, not sourced facts |
| 16. Business Use Cases | Model recommendations | Advisory, not sourced facts |
| 17. Business Outcomes | Model recommendations | Advisory, not sourced facts |
| 18. Recent News & Trends | Search (last 6–12 months) | Entirely dependent on live search |

**Rule of thumb:** sections 2, 6, 11, and 18 lean heavily on *live search*
(and are only as current as what Google surfaces). Sections 7, 8, 9, and 13–17
are largely the model's *expertise and recommendations* applied to the company,
not quoted facts.

---

## 4. Factual vs. inferred — and how to tell

The prompts instruct the model to:

- Use **real numbers, dates, and names** when it finds them in search results.
- **Not fabricate** precise figures (revenue, employee counts, dates) that
  weren't in the research.
- Explicitly **note when something is estimated or not publicly disclosed**
  rather than inventing it.
- Make **clearly reasonable, industry-informed inferences** to fill gaps —
  rather than leaving fields blank — but keep those separate from hard facts.

**How to verify:** the **Sources** section at the bottom of each report lists
the actual URLs Gemini used. For any specific claim that matters (a revenue
figure, a recent event), open the cited sources to confirm it. Treat the
advisory sections (AI/Analytics/Salesforce opportunities, use cases, discovery
questions) as informed suggestions to react to, not verified facts.

---

## 5. "Grounded" vs. "fallback" reports

Each report carries a `grounded` flag:

- **`grounded: true`** — the report was built from live Google Search results,
  and the Sources list reflects the pages used. This is the normal, preferred
  mode and gives you current information with citations.

- **`grounded: false`** — live search was unavailable (usually because the
  free-tier search quota was exhausted), so the report came from the model's
  training knowledge. The UI shows a warning banner and the Sources list will
  be empty. This data can be **out of date** (the model's knowledge has a
  training cutoff) and should be verified before use — especially anything in
  the "Recent News" or "Company-Specific Challenges" sections.

You can force non-search mode by setting `ENABLE_GROUNDING=false` in `.env`
(useful if you want to conserve search quota or work fully offline of search).

---

## 6. Which model and search service

- **Model:** Google Gemini, configurable via `GEMINI_MODEL` in `.env`
  (default `gemini-3.5-flash`). Any Gemini model that supports **both** Google
  Search grounding **and** structured JSON output will work.
- **Search:** Google Search, accessed through Gemini's built-in `googleSearch`
  grounding tool. The app does not call a separate search API or scrape pages
  itself — Gemini performs the searches and returns both the synthesized text
  and the source citations.
- **Auth:** a single Gemini API key (`GEMINI_API_KEY`). No other credentials,
  accounts, or services are involved.

---

## 7. What the app does NOT do

To be explicit about the boundaries:

- It does **not** store or cache reports — every request regenerates from
  scratch. (Caching is a documented future enhancement.)
- It does **not** access any private, internal, or paywalled data. Only public
  web content and the model's general knowledge.
- It does **not** guarantee accuracy. Structured output guarantees the report
  is *well-formed*, not that every value is *correct*. Always sanity-check
  figures against the cited sources.
- It does **not** perform its own web scraping, use Wikipedia dumps, or read
  annual-report PDFs directly. It relies on whatever Google Search surfaces.

---

## 8. Accuracy, freshness, and limitations

- **Freshness** is limited by Google Search coverage (grounded mode) or the
  model's training cutoff (fallback mode). Very recent events may be missing or
  incomplete.
- **Private companies** yield thinner reports than public ones, because far
  less is publicly disclosed (no filings, fewer hard numbers). The model will
  infer more and mark more fields as "not publicly disclosed."
- **Ambiguous names** (e.g. a generic or shared company name) can cause the
  model to research the wrong entity. It's prompted to flag this and pick the
  closest plausible match — but confirm you got the right company via the
  Sources.
- **Hallucination risk** is reduced (by grounding and by the "don't fabricate
  numbers" instruction) but not eliminated. The Sources list exists precisely
  so you can verify anything important.

---

## 9. Data privacy

- The only thing sent to Google is the **company name** you type (plus the
  fixed prompt text). No personal or internal data leaves the app.
- Your API key lives only in the local `.env` file and is never sent to the
  browser or exposed in the report.
- Standard Gemini API data-handling terms apply to the requests; review
  Google's terms if you plan to process sensitive company names.

---

## 10. Quick reference

| Question | Answer |
|---|---|
| Where does company data come from? | Live Google Search (via Gemini grounding) + the Gemini model's knowledge |
| Is there a stored database? | No — every report is generated on demand |
| Can I see the sources? | Yes — the Sources section lists the URLs used (grounded mode) |
| What if search quota runs out? | Auto-fallback to model knowledge; report flagged `grounded: false` |
| Does it read my files or CRM? | No — public web + model knowledge only |
| Are the numbers guaranteed correct? | No — verify important figures against the cited sources |
| Which sections are most time-sensitive? | Company Overview, Recent News, Company-Specific Challenges |
| Which sections are recommendations, not facts? | AI / Analytics / Salesforce opportunities, use cases, outcomes |

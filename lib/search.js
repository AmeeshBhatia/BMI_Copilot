// Tavily search provider — a free (1,000 searches/month, no credit card) AI
// search API that returns live web results plus their source URLs. We run a
// handful of targeted queries per company, then hand the results to Gemini for
// synthesis. This gives live, cited reports without any Google billing.
//
// Get a free key at https://app.tavily.com  →  put it in .env as TAVILY_API_KEY.

const TAVILY_ENDPOINT = "https://api.tavily.com/search";

// A small set of queries that together cover the report's needs while staying
// well within the free monthly credit allowance (each query = ~1 credit).
function buildQueries(companyName) {
  return [
    `${companyName} company overview headquarters founded employees leadership legal structure mission`,
    `${companyName} products services business model revenue target market competitors`,
    `${companyName} technology stack digital transformation industry trends partnerships financials`,
    `${companyName} latest news 2026 reputation reviews controversies`
  ];
}

async function runTavilyQuery(apiKey, query) {
  const res = await fetch(TAVILY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic",
      max_results: 5,
      include_answer: true
    })
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(`Tavily search failed (${res.status}): ${body.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

/**
 * Research a company with Tavily. Returns organized research notes (built from
 * the live search results) plus the list of source URLs for citation.
 */
export async function researchWithTavily(companyName) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("TAVILY_API_KEY is not set.");

  const queries = buildQueries(companyName);
  const results = await Promise.all(queries.map((q) => runTavilyQuery(apiKey, q)));

  const sources = [];
  const noteBlocks = [];

  results.forEach((data, i) => {
    const block = [`## Research theme: ${queries[i]}`];
    if (data.answer) block.push(`Summary: ${data.answer}`);
    for (const r of data.results || []) {
      if (r.url) sources.push({ title: r.title || r.url, url: r.url });
      if (r.content) block.push(`- [${r.title || "source"}] ${r.content}`);
    }
    noteBlocks.push(block.join("\n"));
  });

  const researchNotes =
    `Live web research for "${companyName}" (collected ${new Date().toISOString().slice(0, 10)}):\n\n` +
    noteBlocks.join("\n\n");

  return { researchNotes, sources };
}

// ----- Theme (light / dark) -----
const themeToggle = document.getElementById("theme-toggle");

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  if (themeToggle) themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
}

function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem("bmi-theme"); } catch (_) {}
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved || (prefersDark ? "dark" : "light"));
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem("bmi-theme", next); } catch (_) {}
  });
}
initTheme();

const form = document.getElementById("research-form");
const input = document.getElementById("company-input");
const submitBtn = document.getElementById("submit-btn");
const statusLine = document.getElementById("status-line");
const reportRoot = document.getElementById("report-root");

const LOADING_MESSAGES = [
  "Searching the web for public information…",
  "Reading recent news and filings…",
  "Mapping the business model and revenue streams…",
  "Assembling the discovery-ready briefing…"
];

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const companyName = input.value.trim();
  if (!companyName) return;

  submitBtn.disabled = true;
  reportRoot.hidden = true;
  statusLine.classList.remove("error");
  cycleStatusMessages();

  try {
    const res = await fetch("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName })
    });

    // Read as text first so we can show a helpful message even when the server
    // returns a non-JSON error page (e.g. a Vercel timeout/crash page).
    const raw = await res.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      const lower = raw.toLowerCase();
      if (res.status === 504 || lower.includes("timeout") || lower.includes("timed out")) {
        throw new Error("The request took too long and timed out (server limit is 60s). Try again, or switch to a faster model (set GEMINI_MODEL=gemini-3.5-flash-lite).");
      }
      throw new Error(`Server error (${res.status}). ${raw.slice(0, 160)}`);
    }

    if (!res.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }

    renderReport(data.report);
    statusLine.textContent = "";
  } catch (err) {
    statusLine.textContent = err.message || "Something went wrong.";
    statusLine.classList.add("error");
  } finally {
    submitBtn.disabled = false;
    stopCyclingStatus();
  }
});

let statusInterval = null;
function cycleStatusMessages() {
  let i = 0;
  statusLine.innerHTML = `<span class="spinner"></span>${LOADING_MESSAGES[0]}`;
  statusInterval = setInterval(() => {
    i = (i + 1) % LOADING_MESSAGES.length;
    statusLine.innerHTML = `<span class="spinner"></span>${LOADING_MESSAGES[i]}`;
  }, 3500);
}
function stopCyclingStatus() {
  if (statusInterval) clearInterval(statusInterval);
  statusInterval = null;
}

function esc(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// A value is "blank" if it's missing or one of the not-useful placeholder
// phrases. Blank values/sections are hidden entirely — we never show
// "Not available".
function isBlank(v) {
  if (v === null || v === undefined) return true;
  const s = String(v).trim().toLowerCase();
  if (!s) return true;
  return ["not available", "n/a", "na", "unknown", "none", "not disclosed",
    "not publicly available", "not applicable", "to be confirmed",
    "to be confirmed in discovery", "tbd", "-", "—"].includes(s);
}

function cleanItems(items) {
  return (items || []).filter((i) => !isBlank(i));
}

// Only render a card if it has real content.
function card(numLabel, title, innerHtml) {
  if (!innerHtml || !innerHtml.replace(/\s/g, "")) return "";
  return `
    <div class="card">
      <h2><span class="num">${numLabel}</span>${esc(title)}</h2>
      ${innerHtml}
    </div>`;
}

function list(items) {
  const clean = cleanItems(items);
  if (!clean.length) return "";
  return `<ul class="plain">${clean.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
}

function kvGrid(pairs) {
  const clean = pairs.filter(([, value]) => !isBlank(value));
  if (!clean.length) return "";
  return `<div class="kv-grid">${clean
    .map(
      ([label, value]) => `
      <div class="kv-item">
        <div class="label">${esc(label)}</div>
        <div class="value">${esc(value)}</div>
      </div>`
    )
    .join("")}</div>`;
}

function field(label, value) {
  if (isBlank(value)) return "";
  return `<div class="field"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div></div>`;
}

function table(headers, rows) {
  const clean = (rows || []).filter((r) => r.some((c) => !isBlank(c)));
  if (!clean.length) return "";
  return `
    <table>
      <thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
      <tbody>
        ${clean
          .map((r) => `<tr>${r.map((c) => `<td>${isBlank(c) ? "" : esc(c)}</td>`).join("")}</tr>`)
          .join("")}
      </tbody>
    </table>`;
}

function linkList(items) {
  const clean = (items || []).filter((s) => s && !isBlank(s.url));
  if (!clean.length) return "";
  return `<div class="sources-list">${clean
    .map((s) => `<div><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.platform || s.title || s.url)}</a></div>`)
    .join("")}</div>`;
}

// A labelled list block that hides itself when empty.
function subList(label, items) {
  const inner = list(items);
  if (!inner) return "";
  return `<div class="field"><div class="label">${esc(label)}</div><div class="value">${inner}</div></div>`;
}

// Wraps a table with a label; hides itself (label included) when the table is empty.
function labeledTable(label, headers, rows) {
  const t = table(headers, rows);
  if (!t) return "";
  return `<div class="field"><div class="label">${esc(label)}</div>${t}</div>`;
}

// Wraps a block under a sub-heading; hides the heading if the block is empty.
function subhead(title, inner) {
  if (!inner || !inner.replace(/\s/g, "")) return "";
  return `<div class="subhead">${esc(title)}</div>${inner}`;
}

function renderReport(r) {
  const sections = [];

  const groundingNote = r.grounded === false
    ? `<div class="meta" style="color:var(--warn);margin-top:4px;">⚠ Generated from the model's own knowledge (live web search quota unavailable) — verify time-sensitive details.</div>`
    : "";

  const co = r.companyOverview || {};
  sections.push(`
    <div class="card report-header">
      <div>
        <h1>${esc(r.companyName)}</h1>
        <div class="meta">Business Model Intelligence Briefing</div>
        ${groundingNote}
      </div>
      <span class="tag">${esc(co.legalStructure || "")}</span>
    </div>
  `);

  // 1. Executive Summary
  const es = r.executiveSummary || {};
  sections.push(
    card(
      "1",
      "Executive Summary",
      [
        field("What the company does", es.whatItDoes),
        field("Primary customers", es.primaryCustomers),
        field("Revenue sources", es.revenueSources),
        field("Current priorities", es.currentPriorities),
        field("Biggest challenges", es.biggestChallenges),
        field("Growth opportunities", es.growthOpportunities)
      ].join("")
    )
  );

  // 2. Company Overview / Client Profile
  const brand = co.brandIdentity || {};
  const org = co.organizationalStructure || {};
  sections.push(
    card(
      "2",
      "Company Overview / Client Profile",
      kvGrid([
        ["Full Legal Name / DBAs", co.fullLegalName],
        ["Pronunciation", co.pronunciation],
        ["Abbreviations", co.abbreviations],
        ["Industry", co.industry],
        ["Founded", co.founded],
        ["Years in Business", co.yearsInBusiness],
        ["Headquarters", co.headquarters],
        ["Key Locations", co.keyLocations],
        ["Countries Served", co.countriesServed],
        ["Employees", co.employeeCount],
        ["Company Size", co.companySize],
        ["Legal Structure", co.legalStructure],
        ["Parent Company", co.parentCompany],
        ["Market Position", co.marketPosition]
      ]) +
      (function () {
        const links = linkList([...(co.website ? [{ platform: co.website, url: co.website }] : []), ...(co.socialMedia || [])]);
        return links ? `<div class="field"><div class="label">Website & Social Media</div>${links}</div>` : "";
      })() +
      subhead("Brand Identity",
        field("Tagline", brand.tagline) +
        field("Brand Voice", brand.brandVoice) +
        field("Logo / Visual Identity", brand.logo)) +
      subhead("Organizational Structure",
        field("Overview", org.overview) +
        subList("Key Departments", org.keyDepartments) +
        labeledTable("Leadership", ["Name", "Role"],
          (org.leadership || []).map((l) => [l.name, l.role])))
    )
  );

  // 3. Business Model
  const bm = r.businessModel || {};
  sections.push(
    card(
      "3",
      "Business Model",
      [
        field("Problem solved", bm.problemSolved),
        field("Customers", bm.customers),
        field("Products & services", bm.productsAndServices),
        field("Value delivery", bm.valueDelivery),
        field("Why customers choose them", bm.whyCustomersChoose),
        field("Differentiation", bm.differentiation)
      ].join("")
    )
  );

  // 4. Revenue Model
  sections.push(
    card("4", "Revenue Model",
      table(["Stream", "Description", "Importance"],
        (r.revenueStreams || []).map((x) => [x.name, x.description, x.relativeImportance])))
  );

  // 5. Customer Segments
  sections.push(
    card("5", "Customer Segments",
      table(["Segment", "What they buy"],
        (r.customerSegments || []).map((x) => [x.segment, x.whatTheyBuy])))
  );

  // 6. Products & Services
  sections.push(
    card("6", "Products & Services",
      table(["Offering", "Description"],
        (r.productsAndServices || []).map((x) => [x.name, x.description])))
  );

  // 7. Value Chain
  sections.push(
    card("7", "Value Chain",
      table(["Stage", "Description"],
        (r.valueChain || []).map((x) => [x.stage, x.description])))
  );

  // 8. Key Business Processes
  sections.push(
    card("8", "Key Business Processes",
      table(["Process", "Description"],
        (r.keyBusinessProcesses || []).map((x) => [x.process, x.description])))
  );

  // 9. Business KPIs
  sections.push(
    card("9", "Business KPIs",
      table(["KPI", "Why it matters", "Formula", "Target / Benchmark"],
        (r.businessKPIs || []).map((x) => [x.kpi, x.whyItMatters, x.formula, x.targetBenchmark])))
  );

  // 10. Industry Challenges
  sections.push(card("10", "Industry Challenges", list(r.industryChallenges)));

  // 11. Company-Specific Challenges
  sections.push(card("11", "Company-Specific Challenges", list(r.companyChallenges)));

  // 12. SWOT
  const swot = r.swot || {};
  const swotBox = (cls, heading, items) => {
    const l = list(items);
    return l ? `<div class="swot-box ${cls}"><h3>${heading}</h3>${l}</div>` : "";
  };
  sections.push(
    card("12", "SWOT Analysis",
      (function () {
        const boxes = swotBox("strengths", "Strengths", swot.strengths) +
          swotBox("weaknesses", "Weaknesses", swot.weaknesses) +
          swotBox("opportunities", "Opportunities", swot.opportunities) +
          swotBox("threats", "Threats", swot.threats);
        return boxes ? `<div class="swot-grid">${boxes}</div>` : "";
      })())
  );

  // 13. Culture & Values  (NEW)
  const cv = r.cultureValues || {};
  sections.push(
    card("13", "Culture & Values",
      field("Mission & Vision", cv.missionVision) +
      subList("Core Values", cv.coreValues) +
      field("Work Culture", cv.workCulture) +
      field("Corporate Social Responsibility", cv.corporateSocialResponsibility))
  );

  // 14. Partnerships & Alliances  (NEW)
  sections.push(card("14", "Partnerships & Alliances", list(r.partnershipsAlliances)));

  // 15. Financials  (NEW)
  const fin = r.financials || {};
  sections.push(
    card("15", "Financials",
      field("Revenue / Estimates", fin.revenueEstimate) +
      field("Funding & Investments", fin.fundingInvestments) +
      field("Financial Challenges", fin.financialChallenges))
  );

  // 16. AI Opportunities
  sections.push(card("16", "AI Opportunities", list(r.aiOpportunities)));

  // 17. Analytics Opportunities
  sections.push(card("17", "Analytics Opportunities", list(r.analyticsOpportunities)));

  // 18. Salesforce Opportunities
  sections.push(
    card("18", "Salesforce Opportunities",
      table(["Product", "Why it fits"],
        (r.salesforceOpportunities || []).map((x) => [x.product, x.reason])))
  );

  // 19. Business Use Cases
  sections.push(card("19", "Business Use Cases", list(r.businessUseCases)));

  // 20. Business Outcomes
  sections.push(card("20", "Business Outcomes", list(r.businessOutcomes)));

  // 21. Recent News & Trends
  sections.push(
    card("21", "Recent News & Trends",
      table(["Timeframe", "Headline", "Summary"],
        (r.recentNews || []).map((x) => [x.timeframe, x.headline, x.summary])))
  );

  // Sources
  if (r.sources && r.sources.length) {
    sections.push(`
      <div class="card">
        <h2>Sources</h2>
        <div class="sources-list">
          ${r.sources
            .map((s) => `<div><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></div>`)
            .join("")}
        </div>
      </div>
    `);
  }

  reportRoot.innerHTML = sections.join("");
  reportRoot.hidden = false;
}

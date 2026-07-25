# BMI Copilot — Project Overview

**Tagline:** Enter any company name and instantly understand how the business works.

## What it is

BMI Copilot (Business Model Intelligence Copilot) is a web app that generates a
consultant-ready briefing on any company in under a minute. Instead of spending
hours across a company's website, news, LinkedIn, and financial reports before a
client meeting, a user types the company name and gets a single, structured
report explaining the business the way a consultant would.

**Who it's for:** business analysts, consultants, solution architects, sales and
pre-sales teams, and project managers preparing for client discovery.

## How it works

The app runs a two-stage AI pipeline each time you search:

1. **Research** — It gathers live public information about the company. When a
   Tavily search key is configured, it runs several web searches and collects
   real results plus source URLs (free). If not, it falls back to Google Search
   grounding, and finally to the AI model's own knowledge.
2. **Synthesis** — It sends that research to Google's Gemini model, which writes
   the findings into a fixed, structured report format. A JSON schema guarantees
   every section comes back in the same shape, and empty or unknown fields are
   hidden automatically so the report always looks clean.

The result renders instantly in the browser, with a **Sources** list of the web
pages used so any fact can be verified.

## What's in the report

A single briefing covers, in order: **Executive Summary**, **Company Overview /
Client Profile** (legal name, brand identity, HQ, size, leadership, social
links), **Business Model**, **Revenue Model**, **Customer Segments**, **Products
& Services**, **Value Chain**, **Key Business Processes**, **Business KPIs**,
**Industry & Company Challenges**, **SWOT**, **Culture & Values**, **Partnerships
& Alliances**, **Financials**, **AI / Analytics / Salesforce Opportunities**,
**Business Use Cases & Outcomes**, and **Recent News**. The interface also
supports light and dark mode.

## Where the data comes from

There is no stored company database — every report is generated fresh from
**live public web results** (via the Tavily search API) plus the **Gemini
model's general knowledge**. It never accesses private files, internal systems,
or paid data. Only the company name is sent out; the API keys stay server-side.

## Technology

A lightweight **Node.js / Express** app: a static HTML/CSS/JavaScript front end
and a small back end that calls the **Google Gemini API** (for writing) and the
**Tavily API** (for live search). No database, no build step. It runs locally
with `npm start` and is deployed on **Vercel** as a static site plus a
serverless function, using free tiers of all three services.

## Configuration

Two keys, set in a `.env` file locally or in Vercel's Environment Variables:
`GEMINI_API_KEY` (required, writes the report) and `TAVILY_API_KEY`
(recommended, provides free live web research with citations).

## Status & limits

The app is functional and deployed. Reports are informative but AI-generated —
specific figures and recent events should be verified against the cited sources
before client use. Free-tier limits apply (search quota, and a 60-second
function limit on Vercel's free plan). The app currently has no login, so a
public URL should be password-protected before wide sharing.

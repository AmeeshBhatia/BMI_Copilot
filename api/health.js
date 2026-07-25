// Diagnostic endpoint: visit /api/health on the deployed site to check that the
// serverless functions run and that the API keys are configured.
export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    functionsWorking: true,
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    hasTavilyKey: Boolean(process.env.TAVILY_API_KEY),
    model: process.env.GEMINI_MODEL || "gemini-3.5-flash (default)"
  });
}

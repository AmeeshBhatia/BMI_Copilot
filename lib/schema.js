// JSON Schema for the Business Model Intelligence report.
// Kept lean and focused so the model reliably fills every field. Passed to
// Gemini's structured output so the answer matches this shape exactly.

const stringList = { type: "array", items: { type: "string" } };

export const reportSchema = {
  type: "object",
  properties: {
    companyName: { type: "string", description: "Official name of the company." },

    // 1. Executive Summary (30-second read)
    executiveSummary: {
      type: "object",
      properties: {
        whatItDoes: { type: "string" },
        primaryCustomers: { type: "string" },
        revenueSources: { type: "string" },
        currentPriorities: { type: "string" },
        biggestChallenges: { type: "string" },
        growthOpportunities: { type: "string" }
      },
      required: ["whatItDoes", "primaryCustomers", "revenueSources", "currentPriorities", "biggestChallenges", "growthOpportunities"]
    },

    // 2. Company Overview / Client Profile
    companyOverview: {
      type: "object",
      properties: {
        fullLegalName: { type: "string", description: "Official legal name and any associated brands / DBAs." },
        pronunciation: { type: "string", description: "Correct pronunciation." },
        abbreviations: { type: "string", description: "Common abbreviations or acronyms." },
        industry: { type: "string" },
        founded: { type: "string" },
        yearsInBusiness: { type: "string" },
        headquarters: { type: "string" },
        keyLocations: { type: "string", description: "Notable regional / other offices." },
        countriesServed: { type: "string" },
        employeeCount: { type: "string" },
        companySize: { type: "string", description: "Size category implied by headcount." },
        website: { type: "string" },
        socialMedia: {
          type: "array",
          items: {
            type: "object",
            properties: { platform: { type: "string" }, url: { type: "string" } },
            required: ["platform", "url"]
          }
        },
        parentCompany: { type: "string" },
        legalStructure: { type: "string", description: "Public, private, or non-profit; ticker if public." },
        marketPosition: { type: "string" },
        brandIdentity: {
          type: "object",
          properties: {
            logo: { type: "string" },
            tagline: { type: "string" },
            brandVoice: { type: "string" }
          },
          required: ["logo", "tagline", "brandVoice"]
        },
        organizationalStructure: {
          type: "object",
          properties: {
            overview: { type: "string" },
            keyDepartments: stringList,
            leadership: {
              type: "array",
              items: {
                type: "object",
                properties: { name: { type: "string" }, role: { type: "string" } },
                required: ["name", "role"]
              }
            }
          },
          required: ["overview", "keyDepartments", "leadership"]
        }
      },
      required: ["fullLegalName", "pronunciation", "abbreviations", "industry", "founded", "yearsInBusiness", "headquarters", "keyLocations", "countriesServed", "employeeCount", "companySize", "website", "socialMedia", "parentCompany", "legalStructure", "marketPosition", "brandIdentity", "organizationalStructure"]
    },

    // 3. Business Model
    businessModel: {
      type: "object",
      properties: {
        problemSolved: { type: "string" },
        customers: { type: "string" },
        productsAndServices: { type: "string" },
        valueDelivery: { type: "string" },
        whyCustomersChoose: { type: "string" },
        differentiation: { type: "string" }
      },
      required: ["problemSolved", "customers", "productsAndServices", "valueDelivery", "whyCustomersChoose", "differentiation"]
    },

    // 4. Revenue Model
    revenueStreams: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          relativeImportance: { type: "string", enum: ["Primary", "Secondary", "Emerging"] }
        },
        required: ["name", "description", "relativeImportance"]
      }
    },

    // 5. Customer Segments
    customerSegments: {
      type: "array",
      items: {
        type: "object",
        properties: { segment: { type: "string" }, whatTheyBuy: { type: "string" } },
        required: ["segment", "whatTheyBuy"]
      }
    },

    // 6. Products & Services
    productsAndServices: {
      type: "array",
      items: {
        type: "object",
        properties: { name: { type: "string" }, description: { type: "string" } },
        required: ["name", "description"]
      }
    },

    // 7. Value Chain
    valueChain: {
      type: "array",
      items: {
        type: "object",
        properties: { stage: { type: "string" }, description: { type: "string" } },
        required: ["stage", "description"]
      }
    },

    // 8. Key Business Processes
    keyBusinessProcesses: {
      type: "array",
      items: {
        type: "object",
        properties: { process: { type: "string" }, description: { type: "string" } },
        required: ["process", "description"]
      }
    },

    // 9. Business KPIs
    businessKPIs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kpi: { type: "string" },
          whyItMatters: { type: "string" },
          formula: { type: "string" },
          targetBenchmark: { type: "string" }
        },
        required: ["kpi", "whyItMatters", "formula", "targetBenchmark"]
      }
    },

    // 10. Industry Challenges
    industryChallenges: stringList,

    // 11. Company-Specific Challenges
    companyChallenges: stringList,

    // 12. SWOT
    swot: {
      type: "object",
      properties: {
        strengths: stringList,
        weaknesses: stringList,
        opportunities: stringList,
        threats: stringList
      },
      required: ["strengths", "weaknesses", "opportunities", "threats"]
    },

    // 13. Culture & Values  (NEW)
    cultureValues: {
      type: "object",
      properties: {
        missionVision: { type: "string" },
        coreValues: stringList,
        workCulture: { type: "string", description: "Innovative, conservative, collaborative, etc." },
        corporateSocialResponsibility: { type: "string", description: "Sustainability, philanthropy, ethics." }
      },
      required: ["missionVision", "coreValues", "workCulture", "corporateSocialResponsibility"]
    },

    // 14. Partnerships & Alliances  (NEW)
    partnershipsAlliances: stringList,

    // 15. Financials  (NEW)
    financials: {
      type: "object",
      properties: {
        revenueEstimate: { type: "string", description: "Revenue / financials or analyst estimates." },
        fundingInvestments: { type: "string", description: "Funding rounds, M&A, IPOs." },
        financialChallenges: { type: "string", description: "Reported difficulties or restructuring." }
      },
      required: ["revenueEstimate", "fundingInvestments", "financialChallenges"]
    },

    // 16. AI Opportunities
    aiOpportunities: stringList,

    // 17. Analytics Opportunities
    analyticsOpportunities: stringList,

    // 18. Salesforce Opportunities
    salesforceOpportunities: {
      type: "array",
      items: {
        type: "object",
        properties: { product: { type: "string" }, reason: { type: "string" } },
        required: ["product", "reason"]
      }
    },

    // 19. Business Use Cases
    businessUseCases: stringList,

    // 20. Business Outcomes
    businessOutcomes: stringList,

    // 21. Recent News & Trends
    recentNews: {
      type: "array",
      items: {
        type: "object",
        properties: {
          headline: { type: "string" },
          summary: { type: "string" },
          timeframe: { type: "string" }
        },
        required: ["headline", "summary", "timeframe"]
      }
    }
  },
  required: [
    "companyName", "executiveSummary", "companyOverview", "businessModel",
    "revenueStreams", "customerSegments", "productsAndServices", "valueChain",
    "keyBusinessProcesses", "businessKPIs", "industryChallenges", "companyChallenges",
    "swot", "cultureValues", "partnershipsAlliances", "financials",
    "aiOpportunities", "analyticsOpportunities", "salesforceOpportunities",
    "businessUseCases", "businessOutcomes", "recentNews"
  ]
};

// Demo assistant response engine for the Maximo sales chat.
// Ported and condensed from the cases in src/imports/ChatInterface.jsx so the
// panel is self-contained (no RAG backend). Pure, deterministic keyword routing.

export interface ChatSource {
  doc: string;
  section: string;
  confidence: number;
}

export interface AssistantReply {
  answer: string;
  confidence: number | null;
  sources?: ChatSource[];
}

/** Prompts shown on the empty (cold-start) chat, mirroring the design. */
export const QUICK_ACTIONS = [
  'Build a quote from my deal description',
  'I have a new customer interested in Maximo',
  "What's the difference between Health and Predict?",
  'How do AppPoints work?',
];

const SOURCES = {
  competition: [
    { doc: 'IBM Maximo Competitive Positioning', section: 'SAP, IFS, and ServiceNow comparisons', confidence: 86 },
    { doc: 'Maximo AI and APM Overview', section: 'Differentiated AI-enabled operations', confidence: 84 },
  ],
  pricing: [
    { doc: 'MAS AppPoints Pricing Overview', section: 'Concurrent user model and packaging', confidence: 91 },
    { doc: 'Maximo SaaS Sizing Guide', section: 'Edition, environment, and commercial drivers', confidence: 88 },
  ],
  assetManagement: [
    { doc: 'Maximo Seller Discovery Guide', section: 'Asset management discovery motions', confidence: 90 },
    { doc: 'Maximo Suite Positioning Guide', section: 'Manage, Mobile, Scheduler, Health, Monitor, Predict', confidence: 88 },
  ],
} satisfies Record<string, ChatSource[]>;

export function getAssistantReply(question: string): AssistantReply {
  const q = question.toLowerCase();

  // Quote builder kickoff
  if (/describe.*deal|build.*quote|create.*quote|new deal|deal description/.test(q)) {
    return {
      answer: `Great — I'll help you build a quote. Describe the deal in plain language: the customer's industry, what they need, roughly how many users, and any special requirements.

For example: "Large oil and gas company needs asset management with IoT monitoring on their rigs. About 200 maintenance staff. Quote for 3 years."

I'll recommend modules, estimate AppPoints, and set up a configuration you can open in the estimator.`,
      confidence: null,
    };
  }

  // New customer discovery
  if (/new customer|new opportunity|interested in maximo/.test(q)) {
    return {
      answer: `Here's how I'd approach a new Maximo opportunity.

Discovery questions to ask:
• What assets are they managing — facilities, equipment, infrastructure, IT assets?
• What's their biggest pain point — reactive maintenance, downtime, compliance, manual processes?
• How many maintenance and operations staff will use the system?
• Do they have IoT sensors or want predictive capabilities?
• Any specific industry requirements — aviation, utilities, oil & gas?

Common starting points:
• Core EAM: lead with Maximo Manage for work orders, assets, and inventory
• Mobile workforce: add Mobile for field technicians
• Predictive maintenance: consider Health (scoring) or Predict (AI forecasting)
• IoT monitoring: add Monitor for real-time sensor data

Once you know their needs, describe the scenario and I'll turn it into a quote-ready estimate.`,
      confidence: null,
    };
  }

  // Health vs Predict (and general module comparison)
  if (/health.*predict|predict.*health|difference between/.test(q)) {
    return {
      answer: `Maximo Health and Maximo Predict solve related but distinct problems:

• Maximo Health scores current asset condition and risk, so teams can prioritize maintenance by criticality — it answers "which assets need attention now?"
• Maximo Predict uses AI to forecast future failures and remaining useful life — it answers "when is this asset likely to fail?"

Health is the right entry point when the customer wants risk-based prioritization from existing data. Predict adds forward-looking failure modeling and pairs best once Health and historical failure patterns are in place. Many customers adopt Manage → Health → Predict as a maturity path.`,
      confidence: 87,
      sources: SOURCES.assetManagement,
    };
  }

  // Competitive
  if (/compare|versus|\bvs\b|sap|ifs|servicenow|infor|competitive|competition/.test(q)) {
    return {
      answer: `Maximo is strongest when the buyer cares about enterprise asset management depth, operational resilience, and expanding from core EAM into broader APM.

Key competitive angles:
• vs SAP — emphasize maintenance and asset-operational depth
• vs IFS — emphasize enterprise scale, ecosystem, and MAS platform breadth
• vs ServiceNow — emphasize purpose-built asset and maintenance workflows rather than adjacent workflow tooling

Maximo stands out when the customer needs serious maintenance, asset, inventory, reliability, and operations workflows on one platform, with room to grow into monitoring, health, prediction, and inspection.`,
      confidence: 84,
      sources: SOURCES.competition,
    };
  }

  // AppPoints / pricing
  if (/apppoint|app points|pricing|license|licensing|edition|cost/.test(q)) {
    return {
      answer: `AppPoints are based on concurrent usage, not named users:
• Premium users consume 15 points
• Base users consume 10 points
• Limited users consume 5 points
• Self-Service users consume 0 points

Beyond users, the commercial shape depends on edition, selected modules, environments, and contract term. The fastest path is: identify the customer outcome → map modules → estimate the user mix → refine term and environments. If you already know the use case, I can turn it into a quote-ready draft.`,
      confidence: 88,
      sources: SOURCES.pricing,
    };
  }

  // AI capabilities
  if (/\bai\b|watson|machine learning|\bml\b|anomaly|inspection/.test(q)) {
    return {
      answer: `Maximo delivers practical operations intelligence rather than generic AI:
• Monitor surfaces anomalies and condition signals from sensor data
• Health prioritizes asset risk and maintenance attention
• Predict forecasts failure risk and likely intervention timing
• Visual Inspection supports AI/computer-vision inspection workflows

Maximo applies AI where operations teams actually need it — detecting issues earlier, prioritizing risk, and improving maintenance decisions.`,
      confidence: 85,
      sources: SOURCES.competition,
    };
  }

  // Individual module explanations
  if (/\bmonitor\b/.test(q)) {
    return {
      answer:
        'Maximo Monitor delivers real-time IoT monitoring and anomaly detection. It is best for customers with critical assets and sensor data who need earlier issue detection.',
      confidence: null,
    };
  }
  if (/\bhealth\b/.test(q)) {
    return {
      answer:
        'Maximo Health provides asset health scoring and risk-based maintenance, helping customers prioritize work based on asset condition and business criticality.',
      confidence: null,
    };
  }
  if (/\bpredict\b/.test(q)) {
    return {
      answer:
        'Maximo Predict uses AI to forecast failures and estimate remaining useful life. It is valuable when the customer has historical failure patterns and wants proactive maintenance planning.',
      confidence: null,
    };
  }
  if (/\bmanage\b/.test(q)) {
    return {
      answer:
        'Maximo Manage is the required core EAM module. It covers work, asset, inventory, and maintenance management and is the platform foundation for the other modules.',
      confidence: null,
    };
  }
  if (/saas|deployment/.test(q)) {
    return {
      answer:
        'This estimator is scoped for Maximo Application Suite SaaS. Use it to size the SaaS edition, infrastructure, database, and environments for the customer.',
      confidence: null,
    };
  }

  // Generic fallback
  return {
    answer: `I can help you sell Maximo. Try asking me to:
• Recommend Maximo modules from a customer's needs
• Explain AppPoints and pricing drivers
• Compare Maximo against SAP, IFS, or ServiceNow
• Turn a plain-English deal into an estimator-ready configuration

Tip: describe the customer need in one sentence, or pick one of the suggestions to get started.`,
    confidence: null,
  };
}

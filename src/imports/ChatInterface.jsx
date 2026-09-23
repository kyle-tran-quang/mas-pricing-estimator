import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Button,
  TextArea,
  InlineLoading,
  Tag,
  Tile,
  IconButton
} from '@carbon/react';
import {
  Send,
  Book,
  Add,
  Chat,
  Microphone,
  Flash,
  Code,
  ArrowRight,
  Copy
} from '@carbon/icons-react';
import { detectEstimateInMessage, parseChatConfig, generateShareableUrl } from '../utils/chatConfigParser';
import { calculateFromShorthand } from '../utils/chatCalculator';
import { calculateEstimate } from '../pricingEngine/calculateEstimate';

const INDUSTRY_PATTERNS = [
  { regex: /aviation|airline|airport/i, value: 'aviation' },
  { regex: /nuclear|power generation/i, value: 'nuclear' },
  { regex: /utilities|utility|water|electric/i, value: 'energy' },
  { regex: /oil\s*&\s*gas|oil and gas|refinery|upstream|downstream/i, value: 'oil-gas' },
  { regex: /transport|rail|fleet|logistics/i, value: 'transportation' },
  { regex: /civil|infrastructure|roads|bridges/i, value: 'civil-infrastructure' },
  { regex: /manufacturing|plant|factory/i, value: 'manufacturing' },
  { regex: /life sciences|pharma|biotech/i, value: 'life-sciences' },
  { regex: /government|defense|public sector/i, value: 'government' }
];

const MODULE_RECOMMENDATIONS = [
  { regex: /asset management|eam|work orders?|maintenance management/i, modules: ['manage'] },
  { regex: /monitor|iot|sensors?|condition monitoring|real[- ]time monitoring/i, modules: ['manage', 'monitor'] },
  { regex: /predict|predictive maintenance|failure prediction/i, modules: ['manage', 'health', 'predict'] },
  { regex: /health|asset health|risk based maintenance/i, modules: ['manage', 'health'] },
  { regex: /visual inspection|computer vision|inspection/i, modules: ['visualInspection'] },
  { regex: /it asset|software asset|service desk/i, modules: ['maximoIT'] },
  { regex: /facilities|real estate|space management|lease/i, modules: ['mref'] }
];

const API_BASE_URL = process.env.REACT_APP_RAG_API_URL || 'http://localhost:5001';

const COLD_START_PROMPTS = [
  'Describe a deal and I\'ll build the quote',
  'I have a new customer interested in Maximo',
  'What\'s the difference between Health and Predict',
  'How do AppPoints work?'
];

const GENERAL_PROMPTS = [
  'Compare Maximo vs SAP for asset management',
  'What pain points does Maximo solve better than IFS?',
  'How does Maximo position its AI capabilities?',
  'What are Maximo\'s key differentiators?'
];

const DEMO_SOURCE_LINK = '#demo-source';

const SEISMIC_SOURCES = {
  inspectionAiPoc: [
    { doc_name: 'Maximo Visual Inspection Sales Playbook', section: 'POC and inspection-led opportunities', confidence: 92, url: DEMO_SOURCE_LINK },
    { doc_name: 'MAS Licensing and Packaging Guide', section: 'Visual Inspection and SaaS packaging', confidence: 89, url: DEMO_SOURCE_LINK }
  ],
  freeMonth: [
    { doc_name: 'Deal Desk Structuring Guide', section: 'Trial, delayed billing, and 13-for-12 patterns', confidence: 94, url: DEMO_SOURCE_LINK },
    { doc_name: 'IBM Licensing Handbook', section: 'Subscription term structuring', confidence: 87, url: DEMO_SOURCE_LINK }
  ],
  assetManagement: [
    { doc_name: 'Maximo Seller Discovery Guide', section: 'Asset management discovery motions', confidence: 90, url: DEMO_SOURCE_LINK },
    { doc_name: 'Maximo Suite Positioning Guide', section: 'Manage, Mobile, Scheduler, Health, Monitor, Predict', confidence: 88, url: DEMO_SOURCE_LINK }
  ],
  competition: [
    { doc_name: 'IBM Maximo Competitive Positioning', section: 'SAP, IFS, and ServiceNow comparisons', confidence: 86, url: DEMO_SOURCE_LINK },
    { doc_name: 'Maximo AI and APM Overview', section: 'Differentiated AI-enabled operations', confidence: 84, url: DEMO_SOURCE_LINK }
  ],
  pricing: [
    { doc_name: 'MAS AppPoints Pricing Overview', section: 'Concurrent user model and packaging', confidence: 91, url: DEMO_SOURCE_LINK },
    { doc_name: 'Maximo SaaS Sizing Guide', section: 'Edition, environment, and commercial drivers', confidence: 88, url: DEMO_SOURCE_LINK }
  ]
};

const AMBIGUOUS_INTENT_OPTIONS = [
  'Track assets, work orders, and inventory',
  'Predict failures and reduce downtime',
  'Enable mobile technicians in the field',
  'Build a full APM stack',
  "I'm not sure"
];

const AMBIGUOUS_INTENT_CARD_OPTIONS = [
  {
    title: 'Core asset management',
    prompt: 'Track assets, work orders, and inventory'
  },
  {
    title: 'Predict failures',
    prompt: 'Predict failures and reduce downtime'
  },
  {
    title: 'Mobile technicians',
    prompt: 'Enable mobile technicians in the field'
  },
  {
    title: 'Full APM stack',
    prompt: 'Build a full APM stack'
  },
  {
    title: 'I’m not sure',
    prompt: 'Help me figure it out'
  }
];

// Removed buildInitialAssistantMessage - no longer needed

function ChatInterface({ formData, currentStep, entryMode, guidedContent }) {
  const stepSpecificPrompts = useMemo(() => {
    if (entryMode !== 'guided' || !guidedContent) {
      return [];
    }

    if (entryMode === 'chat') {
      return [
        'My client wants asset management for 120 users',
        'Utilities customer, SaaS, needs monitoring and predictive maintenance',
        'Recommend modules for a manufacturing customer',
        'Open a sample estimate I can review in the estimator'
      ];
    }

    return [
      `Help me with the ${currentStep?.label || 'current'} step.`,
      `Give me a short talk track for the ${currentStep?.label || 'current'} step.`,
      'What objections should I expect here?',
      'What should I ask the customer next?'
    ];
  }, [entryMode, guidedContent, currentStep]);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const preserveMessagesRef = useRef(false);
  const successMessageRef = useRef(null);
  
  // Conversational quote builder state
  const [quoteBuilderContext, setQuoteBuilderContext] = useState(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handler to open config in estimator
  const handleOpenInEstimator = (config) => {
    try {
      if (config) {
        // Dispatch custom event to parent App component
        window.dispatchEvent(new CustomEvent('importChatConfig', { detail: config }));
        
        // Add a temporary message showing the import is in progress
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: '⏳ Loading configuration into estimator...',
            sources: [],
            confidence: null,
            isTemporary: true
          }
        ]);
      }
    } catch (error) {
      console.error('Error opening in estimator:', error);
    }
  };

  // Handler to copy config
  const handleCopyConfig = (messageContent) => {
    navigator.clipboard.writeText(messageContent).then(() => {
      // Could add a toast notification here
      console.log('Configuration copied to clipboard');
    });
  };

  // Handler to generate shareable link
  const handleGenerateLink = (messageContent) => {
    try {
      const config = parseChatConfig(messageContent);
      if (config) {
        const url = generateShareableUrl(config);
        navigator.clipboard.writeText(url).then(() => {
          console.log('Shareable link copied to clipboard');
        });
      }
    } catch (error) {
      console.error('Error generating link:', error);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Removed useEffect that was adding initial assistant message - now using empty messages array

  // Listen for successful import from estimator
  useEffect(() => {
    const handleImportSuccess = (event) => {
      // Set flag to preserve messages on next step change
      preserveMessagesRef.current = true;
      
      // Remove temporary loading message and add success message
      setMessages((prev) => {
        const filtered = prev.filter(msg => !msg.isTemporary);
        const successMsg = {
          role: 'assistant',
          content: '✅ ' + event.detail.message + ' You can now review and adjust the estimate.',
          sources: [],
          confidence: null,
          isPersistent: true
        };
        successMessageRef.current = successMsg;
        return [
          ...filtered,
          successMsg
        ];
      });
    };

    window.addEventListener('chatImportSuccess', handleImportSuccess);
    return () => window.removeEventListener('chatImportSuccess', handleImportSuccess);
  }, []);

  const getContextSummary = () => {
    const selectedModules = formData.selectedModules?.join(', ') || 'manage';
    return `Current estimate context:
- Entry mode: ${entryMode || 'advanced'}
- Step: ${currentStep?.label || 'Unknown'}
- Industry: ${formData.industry || 'Not selected'}
- Deployment: MAS SaaS
- Modules: ${selectedModules}
- Contract term: ${formData.contractTerm || 1} year(s)
- Users: Premium ${formData.userMix?.premium?.concurrent || 0}, Base ${formData.userMix?.base?.concurrent || 0}, Limited ${formData.userMix?.limited?.concurrent || 0}
${guidedContent ? `- Guided focus: ${guidedContent.title}` : ''}`;
  };

  const isKnowledgeBaseQuestion = (question) => {
    const q = question.toLowerCase();
    return [
      'why',
      'compare',
      'versus',
      'vs',
      'sap',
      'infor',
      'aveva',
      'servicenow',
      'ifs',
      'archibus',
      'pain point',
      'competitive',
      'competition',
      'ai',
      'ml',
      'watson',
      'unified platform',
      'differentiator',
      'advantage'
    ].some((keyword) => q.includes(keyword));
  };

  const getStepCoachingResponse = () => {
    if (!guidedContent) {
      return null;
    }

    return {
      answer: `Current step: ${currentStep?.label || 'Current'}

${guidedContent.title}`,
      sources: [],
      confidence: null
    };
  };

  const buildDemoKnowledgeResponse = (question) => {
    const lowerQuestion = question.toLowerCase();

    if (/compare|versus|\bvs\b|sap|ifs|servicenow|infor|competitive|competition/.test(lowerQuestion)) {
      return {
        answer: `Maximo is strongest when the buyer cares about enterprise asset management depth, operational resilience, and expanding from core EAM into broader APM motions.

Key competitive angles:
• against SAP: emphasize maintenance and asset-operational depth
• against IFS: emphasize enterprise scale, ecosystem, and MAS platform breadth
• against ServiceNow: emphasize purpose-built asset and maintenance workflows rather than adjacent workflow tooling

Maximo stands out when the customer needs serious maintenance, asset, inventory, reliability, and operations workflows on one platform, with room to grow into monitoring, health, prediction, and inspection use cases.

If you want, ask me to tailor the competitive angle for a specific competitor or industry.`,
        sources: SEISMIC_SOURCES.competition,
        confidence: 84
      };
    }

    if (/pricing|apppoint|app points|license|licensing|edition|quote/.test(lowerQuestion) && !(/poc|proof of concept|inspection|inspections?|visual inspection/.test(lowerQuestion))) {
      return {
        answer: `Maximo pricing is driven mainly by AppPoints and environment shape:

• Concurrent user mix matters more than named-user counting
• MAS SaaS commercial shape also depends on edition, modules, term length, and non-production needs
• The fastest path is: identify customer outcome → map modules → estimate user mix → refine term and environments

If you already know the use case, I can convert it into a quote-ready draft and open it in the estimator.`,
        sources: SEISMIC_SOURCES.pricing,
        confidence: 88
      };
    }

    if (/ai|watson|ml|machine learning|predict|monitor|health|inspection/.test(lowerQuestion)) {
      return {
        answer: `Maximo AI delivers practical operations intelligence rather than generic AI:

• Monitor helps surface anomalies and condition signals
• Health helps prioritize asset risk and maintenance attention
• Predict helps forecast failure risk and likely intervention timing
• Visual Inspection supports inspection workflows with AI/computer vision scenarios

Maximo uses AI where operations teams actually need it: detecting issues earlier, prioritizing risk, improving maintenance decisions, and scaling inspection and reliability workflows.`,
        sources: SEISMIC_SOURCES.competition,
        confidence: 85
      };
    }

    return {
      answer: `Here’s a seller-friendly demo response:

Maximo is strongest when the customer needs a combination of core EAM, maintenance execution, inventory, reliability, and a path into broader asset performance management. For demo purposes, I can help you turn plain-English customer needs into a pricing-ready recommendation and show supporting IBM/Seismic-style citations.`,
      sources: SEISMIC_SOURCES.competition,
      confidence: 80
    };
  };

  const buildUserMixFromCount = (count, fallback = { premium: 1, base: 3, limited: 1 }) => {
    if (!count || count <= 0) {
      return {
        premium: { concurrent: fallback.premium, authorized: 0 },
        base: { concurrent: fallback.base, authorized: 0 },
        limited: { concurrent: fallback.limited, authorized: 0 },
        selfService: { concurrent: 0, authorized: 0 }
      };
    }

    return {
      premium: { concurrent: Math.max(1, Math.round(count * 0.2)), authorized: 0 },
      base: { concurrent: Math.max(1, Math.round(count * 0.6)), authorized: 0 },
      limited: { concurrent: Math.max(1, count - Math.max(1, Math.round(count * 0.2)) - Math.max(1, Math.round(count * 0.6))), authorized: 0 },
      selfService: { concurrent: 0, authorized: 0 }
    };
  };

  const buildScenarioResponse = (question) => {
    const lowerQuestion = question.toLowerCase();

    if (/poc|proof of concept/.test(lowerQuestion) && /inspection|inspections?/.test(lowerQuestion) && /\bai\b|visual inspection/.test(lowerQuestion)) {
      const inspectionCountMatch = question.match(/(\d+)\s*inspections?/i);
      const inspectionCount = inspectionCountMatch ? parseInt(inspectionCountMatch[1], 10) : 5;
      const config = {
        industry: formData.industry || '',
        industrySolutions: formData.industrySolutions || [],
        deploymentModel: 'saas',
        edition: 'essentials',
        selectedApplications: ['visualInspection'],
        selectedModules: ['visualInspection'],
        selectedAddons: [],
        userMix: buildUserMixFromCount(5, { premium: 1, base: 3, limited: 1 }),
        environments: {
          prod: { size: 'xs', count: 1 },
          nonProd: {},
          matchingProd: 0
        },
        contractTerm: 1,
        dealNotes: `Seller asked for a MAS SaaS POC for ${inspectionCount} AI inspections. Suggested quote starts with Maximo Visual Inspection in SaaS.`
      };

      return {
        answer: `For a MAS SaaS POC with ${inspectionCount} AI inspections, start by quoting **Maximo Visual Inspection**.

Recommended quote structure:
• Product: Maximo Visual Inspection
• Deployment: MAS SaaS
• Starting commercial shape: 1-year POC-style quote
• Initial environment: 1 XS production environment
• Suggested user assumption for estimator: 5 concurrent users

Why this is the right starting point:
• The customer is explicitly asking for inspections with AI
• Visual Inspection is the clearest fit for computer-vision inspection use cases
• For a small POC, keep the initial quote simple and scoped

Since the customer wants a focused AI inspection proof of concept, start with Maximo Visual Inspection in MAS SaaS. Keep the initial scope tight, prove value quickly, and then expand if the inspection workflow shows traction.

Open this in the estimator to review and price it.`,
        sources: SEISMIC_SOURCES.inspectionAiPoc,
        confidence: 91,
        estimateConfig: config,
        hasEstimate: true
      };
    }

    if (/free month|free trial|trial month|delayed billing|13[- ]for[- ]12/.test(lowerQuestion)) {
      const config = {
        industry: formData.industry || '',
        industrySolutions: formData.industrySolutions || [],
        deploymentModel: 'saas',
        edition: formData.deploymentEdition || 'standard',
        selectedApplications: formData.selectedApplications?.length ? formData.selectedApplications : ['manage'],
        selectedModules: formData.selectedApplications?.length ? formData.selectedApplications : ['manage'],
        selectedAddons: formData.selectedAddons || [],
        userMix: formData.userMix,
        environments: {
          ...(formData.environments || {}),
          nonProd: {
            ...((formData.environments && formData.environments.nonProd) || {}),
            xs: Math.max(1, formData.environments?.nonProd?.xs || 0)
          }
        },
        contractTerm: formData.contractTerm || 1,
        dealNotes: `Seller asked for non-production environment and free-month style commercial flexibility. Suggested options: guided trial, 13-for-12 pricing, or delayed billing start.`
      };

      return {
        answer: `There is not a single standard IBM "free month" license construct, so I would not position it that way. Instead, give the seller three real deal structures to discuss:

1. **Free guided trial**
• use when the customer is still validating the use case
• narrow the scope and success criteria
• good for a small POC or technical validation

2. **13-for-12 pricing**
• quote a normal term, but structure commercial value so the customer effectively gets one month free
• useful when procurement wants a concession but the seller wants to preserve contract shape

3. **Delayed billing start**
• start delivery or setup work now, but align billing start to go-live or a future budget date
• useful when the customer needs implementation runway

Since the seller also asked for a non-production environment, I updated the draft estimate to include a non-production XS environment in MAS SaaS.

Suggested deal note for CPQ:
"Customer requested trial-style commercial flexibility. Consider guided trial, 13-for-12 commercial structure, or delayed billing start. Include non-production environment for evaluation and validation."

Open this in the estimator to review and price it.`,
        sources: SEISMIC_SOURCES.freeMonth,
        confidence: 90,
        estimateConfig: config,
        hasEstimate: true
      };
    }

    if (/asset management/.test(lowerQuestion) && !/work order|inventory|predict|monitor|mobile|health|scheduler/.test(lowerQuestion)) {
      return {
        answer: `“Asset management” can mean a few different things in Maximo. Select the closest use case below and I’ll turn it into a quote-ready recommendation.`,
        sources: SEISMIC_SOURCES.assetManagement,
        confidence: 88,
        optionCards: AMBIGUOUS_INTENT_CARD_OPTIONS
      };
    }

    if (/track assets, work orders, and inventory/.test(lowerQuestion)) {
      const config = {
        industry: formData.industry || '',
        industrySolutions: formData.industrySolutions || [],
        deploymentModel: 'saas',
        edition: 'standard',
        selectedApplications: ['manage'],
        selectedModules: ['manage'],
        selectedAddons: ['mobile'],
        userMix: buildUserMixFromCount(25, { premium: 5, base: 15, limited: 5 }),
        environments: formData.environments,
        contractTerm: 3,
        dealNotes: 'Seller selected the core asset management path from chat disambiguation: Manage plus Mobile and Scheduler talk track.'
      };

      return {
        answer: `For the “track assets, work orders, and inventory” path, I would start with:

Recommended quote:
• Maximo Manage
• Mobile
• Scheduler

To cover core asset tracking, work management, inventory, and day-to-day maintenance execution, lead with Maximo Manage. If field execution and schedule coordination matter, add Mobile and Scheduler so the customer gets a complete operational workflow.

I created a draft estimator configuration with Manage and included the deal note context so you can refine users, environments, and commercial shape before CPQ handoff.`,
        sources: SEISMIC_SOURCES.assetManagement,
        confidence: 89,
        estimateConfig: config,
        hasEstimate: true
      };
    }

    if (/predict failures and reduce downtime/.test(lowerQuestion)) {
      const config = {
        industry: formData.industry || '',
        industrySolutions: formData.industrySolutions || [],
        deploymentModel: 'saas',
        edition: 'standard',
        selectedApplications: ['manage', 'health', 'predict'],
        selectedModules: ['manage', 'health', 'predict'],
        selectedAddons: [],
        userMix: buildUserMixFromCount(25, { premium: 5, base: 15, limited: 5 }),
        environments: formData.environments,
        contractTerm: 3,
        dealNotes: 'Seller selected the predictive maintenance path from chat disambiguation: lead with Manage, Health, and Predict.'
      };

      return {
        answer: `For the “predict failures and reduce downtime” path, I would start with:

Recommended quote:
• Maximo Manage
• Maximo Health
• Maximo Predict

To help the customer reduce unplanned downtime, start with Maximo Manage as the operational foundation, then add Health and Predict to score asset condition, surface risk, and support earlier intervention before failures occur.

I created a draft estimator configuration with Manage, Health, and Predict so you can refine users, environments, and commercial shape before CPQ handoff.`,
        sources: SEISMIC_SOURCES.assetManagement,
        confidence: 89,
        estimateConfig: config,
        hasEstimate: true
      };
    }

    if (/enable mobile technicians in the field/.test(lowerQuestion)) {
      const config = {
        industry: formData.industry || '',
        industrySolutions: formData.industrySolutions || [],
        deploymentModel: 'saas',
        edition: 'standard',
        selectedApplications: ['manage'],
        selectedModules: ['manage'],
        selectedAddons: ['mobile'],
        userMix: buildUserMixFromCount(25, { premium: 5, base: 15, limited: 5 }),
        environments: formData.environments,
        contractTerm: 3,
        dealNotes: 'Seller selected the mobile technician path from chat disambiguation: lead with Manage and Mobile.'
      };

      return {
        answer: `For the “enable mobile technicians in the field” path, I would start with:

Recommended quote:
• Maximo Manage
• Mobile

If technicians need to execute work in the field, lead with Maximo Manage and add Mobile so crews can receive, update, and complete work orders away from a desk, enabling more efficient field execution.

I created a draft estimator configuration with Manage and Mobile so you can refine users, environments, and commercial shape before CPQ handoff.`,
        sources: SEISMIC_SOURCES.assetManagement,
        confidence: 88,
        estimateConfig: config,
        hasEstimate: true
      };
    }

    if (/build a full apm stack/.test(lowerQuestion)) {
      const config = {
        industry: formData.industry || '',
        industrySolutions: formData.industrySolutions || [],
        deploymentModel: 'saas',
        edition: 'standard',
        selectedApplications: ['manage', 'monitor', 'health', 'predict'],
        selectedModules: ['manage', 'monitor', 'health', 'predict'],
        selectedAddons: [],
        userMix: buildUserMixFromCount(25, { premium: 5, base: 15, limited: 5 }),
        environments: formData.environments,
        contractTerm: 3,
        dealNotes: 'Seller selected the full APM path from chat disambiguation: lead with Manage, Monitor, Health, and Predict.'
      };

      return {
        answer: `For the “build a full APM stack” path, I would start with:

Recommended quote:
• Maximo Manage
• Maximo Monitor
• Maximo Health
• Maximo Predict

Seller talk track:
"If the customer is trying to mature from core asset management into condition monitoring, health scoring, and predictive maintenance, I’d position a broader APM motion anchored by Manage with Monitor, Health, and Predict layered on top."

I created a draft estimator configuration with the core APM components so the seller can refine users, environments, and commercial shape before CPQ handoff.`,
        sources: SEISMIC_SOURCES.assetManagement,
        confidence: 88,
        estimateConfig: config,
        hasEstimate: true
      };
    }

    if (/i'm not sure|im not sure|help me figure it out/.test(lowerQuestion)) {
      return {
        answer: `That’s fine — this is the most important path for a generalist seller.

Start with this discovery question:
**"Tell me about a recent time equipment failed unexpectedly. What happened, and what did it cost you?"**

Why this works:
• if the customer talks about downtime and critical asset risk, move toward Health / Predict
• if they talk about visibility from sensors or alerts, move toward Monitor
• if they talk about field execution, move toward Mobile
• if they just need better control of work and assets, start with Manage

Then ask:
1. How are work orders handled today?
2. Do technicians need mobile or offline access?
3. Do you already have sensors or condition data?
4. Is the main pain planning work, or predicting failure?
5. Is this a focused POC or a broader operational rollout?

Reply with the customer’s answers and I’ll turn it into a quote-ready recommendation.`,
        sources: SEISMIC_SOURCES.assetManagement,
        confidence: 86
      };
    }

    return null;
  };

  // Conversational Quote Builder Functions
  const parseInitialDealDescription = (description) => {
    const lowerDesc = description.toLowerCase();
    
    // Extract industry
    const detectedIndustry = INDUSTRY_PATTERNS.find(({ regex }) => regex.test(description))?.value || '';
    
    // Extract user count
    const userCountMatch = description.match(/(\d+)\s*(users?|technicians?|workers?|employees?|staff)/i);
    const userCount = userCountMatch ? parseInt(userCountMatch[1], 10) : 0;
    
    // Extract modules/capabilities
    const recommendedModules = Array.from(new Set(
      MODULE_RECOMMENDATIONS
        .filter(({ regex }) => regex.test(description))
        .flatMap(({ modules }) => modules)
    ));
    
    // Extract contract term
    const termMatch = description.match(/(\d+)[- ]year/i);
    const contractTerm = termMatch ? parseInt(termMatch[1], 10) : 3;
    
    // Detect if they mentioned existing system
    const hasExistingSystem = /replacing|migrating from|currently using|have|existing/i.test(lowerDesc);
    const existingSystemMatch = description.match(/(?:replacing|migrating from|currently using|have)\s+([A-Z][A-Za-z\s]+?)(?:\.|,|$|\s+PM|\s+EAM)/i);
    const existingSystem = existingSystemMatch ? existingSystemMatch[1].trim() : null;
    
    return {
      industry: detectedIndustry,
      userCount,
      modules: recommendedModules.length > 0 ? recommendedModules : ['manage'],
      contractTerm,
      hasExistingSystem,
      existingSystem,
      rawDescription: description
    };
  };

  const buildConversationalQuote = (context, userAnswers = {}) => {
    const industry = context.industry || userAnswers.industry || '';
    const modules = context.modules || ['manage'];
    const userCount = context.userCount || userAnswers.userCount || 0;
    const contractTerm = context.contractTerm || userAnswers.contractTerm || 3;
    
    // Determine user roles from answers
    const roles = userAnswers.roles || {};
    const premiumCount = roles.premium || Math.round(userCount * 0.15);
    const baseCount = roles.base || Math.round(userCount * 0.60);
    const limitedCount = roles.limited || (userCount - premiumCount - baseCount);
    
    // Determine environments
    const needsNonProd = userAnswers.needsNonProd !== false;
    
    const config = {
      industry: industry,
      industrySolutions: industry ? [industry === 'oil-gas' ? 'oilGas' : industry === 'civil-infrastructure' ? 'civilInfrastructure' : industry === 'energy' ? 'utilities' : industry] : [],
      deploymentModel: 'saas',
      edition: userCount > 100 ? 'standard' : 'essentials',
      selectedApplications: modules,
      selectedModules: modules,
      selectedAddons: [],
      userMix: {
        premium: { concurrent: premiumCount, authorized: 0 },
        base: { concurrent: baseCount, authorized: 0 },
        limited: { concurrent: limitedCount, authorized: 0 },
        selfService: { concurrent: 0, authorized: 0 }
      },
      environments: needsNonProd ? {
        prod: { size: 'small', count: 1 },
        nonProd: { xs: 1 }
      } : {
        prod: { size: 'small', count: 1 }
      },
      contractTerm: contractTerm,
      dealNotes: `Conversational quote: ${context.rawDescription || 'Customer inquiry'}`
    };
    
    return config;
  };

  const handleEstimateRefinement = (userMessage, previousConfig) => {
    const lowerMessage = userMessage.toLowerCase();
    let updatedConfig = { ...previousConfig };
    let changes = [];
    
    // Handle non-prod environment additions
    if (/add.*non[- ]prod|add.*non[- ]production|include.*non[- ]prod/i.test(lowerMessage)) {
      updatedConfig.environments = {
        ...updatedConfig.environments,
        nonProd: { xs: 1, ...(updatedConfig.environments?.nonProd || {}) }
      };
      changes.push('Added non-production environment (XS)');
    }
    
    // Handle user count adjustments
    const bumpPremiumMatch = userMessage.match(/bump.*premium.*to\s+(\d+)|increase.*premium.*to\s+(\d+)|premium.*to\s+(\d+)/i);
    if (bumpPremiumMatch) {
      const newCount = parseInt(bumpPremiumMatch[1] || bumpPremiumMatch[2] || bumpPremiumMatch[3], 10);
      updatedConfig.userMix.premium.concurrent = newCount;
      changes.push(`Updated Premium users to ${newCount}`);
    }
    
    const bumpBaseMatch = userMessage.match(/bump.*base.*to\s+(\d+)|increase.*base.*to\s+(\d+)|base.*to\s+(\d+)/i);
    if (bumpBaseMatch) {
      const newCount = parseInt(bumpBaseMatch[1] || bumpBaseMatch[2] || bumpBaseMatch[3], 10);
      updatedConfig.userMix.base.concurrent = newCount;
      changes.push(`Updated Base users to ${newCount}`);
    }
    
    const bumpLimitedMatch = userMessage.match(/bump.*limited.*to\s+(\d+)|increase.*limited.*to\s+(\d+)|limited.*to\s+(\d+)/i);
    if (bumpLimitedMatch) {
      const newCount = parseInt(bumpLimitedMatch[1] || bumpLimitedMatch[2] || bumpLimitedMatch[3], 10);
      updatedConfig.userMix.limited.concurrent = newCount;
      changes.push(`Updated Limited users to ${newCount}`);
    }
    
    // Handle contract term changes
    const termMatch = userMessage.match(/change.*term.*to\s+(\d+)|make.*it\s+(\d+)\s+year|(\d+)[- ]year\s+deal/i);
    if (termMatch) {
      const newTerm = parseInt(termMatch[1] || termMatch[2] || termMatch[3], 10);
      updatedConfig.contractTerm = newTerm;
      changes.push(`Updated contract term to ${newTerm} year(s)`);
    }
    
    // Handle module additions
    if (/add.*health/i.test(lowerMessage) && !updatedConfig.selectedModules.includes('health')) {
      updatedConfig.selectedModules.push('health');
      updatedConfig.selectedApplications.push('health');
      changes.push('Added Maximo Health module');
    }
    
    if (/add.*monitor/i.test(lowerMessage) && !updatedConfig.selectedModules.includes('monitor')) {
      updatedConfig.selectedModules.push('monitor');
      updatedConfig.selectedApplications.push('monitor');
      changes.push('Added Maximo Monitor module');
    }
    
    if (/add.*predict/i.test(lowerMessage) && !updatedConfig.selectedModules.includes('predict')) {
      updatedConfig.selectedModules.push('predict');
      updatedConfig.selectedApplications.push('predict');
      changes.push('Added Maximo Predict module');
    }
    
    if (changes.length === 0) {
      return null; // No refinements detected
    }
    
    // Recalculate estimate with updated config
    const estimate = calculateEstimate(updatedConfig);
    
    const totalUsers =
      (updatedConfig.userMix.premium.concurrent || 0) +
      (updatedConfig.userMix.base.concurrent || 0) +
      (updatedConfig.userMix.limited.concurrent || 0);
    
    return {
      answer: `**Updated Quote:**

${changes.map(c => `✓ ${c}`).join('\n')}

**Revised Configuration:**
• Premium: ${updatedConfig.userMix.premium.concurrent} concurrent
• Base: ${updatedConfig.userMix.base.concurrent} concurrent
• Limited: ${updatedConfig.userMix.limited.concurrent} concurrent
• **Total:** ${totalUsers} concurrent users

**Modules:** ${updatedConfig.selectedModules.map(m => {
  const names = { manage: 'Manage', health: 'Health', monitor: 'Monitor', predict: 'Predict', visualInspection: 'Visual Inspection' };
  return names[m] || m;
}).join(', ')}

**Environments:**
• Production: 1 Small environment
${updatedConfig.environments?.nonProd ? '• Non-Production: 1 XS environment' : ''}

**Contract Term:** ${updatedConfig.contractTerm} year(s)

**Updated AppPoints:** ${estimate.totalAppPoints?.toLocaleString() || 'Calculating...'}
**Updated Annual Pricing:** $${estimate.totalCost ? (estimate.totalCost / updatedConfig.contractTerm).toLocaleString() : 'Calculating...'}`,
      sources: [],
      confidence: 92,
      hasEstimate: true,
      estimateConfig: updatedConfig,
      isRefinement: true
    };
  };

  const handleConversationalQuoteBuilder = (userMessage) => {
    // Check if this is the initial "describe a deal" trigger
    if (/describe a deal|build.*quote|create.*quote|new deal|new opportunity/i.test(userMessage)) {
      setQuoteBuilderContext({
        stage: 'initial',
        data: {}
      });
      
      return {
        answer: `Great! I'll help you build a quote. Let's start:

**Describe the deal in your own words** — tell me about the customer's industry, what they need, how many users, and any special requirements.

For example: "Large oil and gas company, about 5000 employees. They have IoT sensors on rigs and want AI inspection for pipeline welds. 3 year deal."`,
        sources: [],
        confidence: null,
        isQuoteBuilder: true
      };
    }
    
    // If we're in quote builder context
    if (quoteBuilderContext) {
      if (quoteBuilderContext.stage === 'initial') {
        // Parse the initial description
        const parsed = parseInitialDealDescription(userMessage);
        
        setQuoteBuilderContext({
          stage: 'clarifying',
          data: parsed
        });
        
        // Ask clarifying questions
        const questions = [];
        
        // Question 1: Existing system
        if (parsed.hasExistingSystem && parsed.existingSystem) {
          questions.push(`1. You mentioned they're ${parsed.existingSystem ? `replacing ${parsed.existingSystem}` : 'replacing an existing system'}. Is this a greenfield deployment or are they migrating from another CMMS?`);
        } else {
          questions.push(`1. Do they have an existing CMMS or is this greenfield?`);
        }
        
        // Question 2: User roles
        if (parsed.userCount > 0) {
          questions.push(`2. Beyond the ${parsed.userCount} users you mentioned, can you break down the roles? (e.g., reliability engineers, supervisors, field techs, office staff)`);
        } else {
          questions.push(`2. Who will use the system? (planners, supervisors, field technicians, executives?)`);
        }
        
        return {
          answer: `Got it. Let me ask a couple of things to get this right:

${questions.join('\n\n')}`,
          sources: [],
          confidence: null,
          isQuoteBuilder: true
        };
      }
      
      if (quoteBuilderContext.stage === 'clarifying') {
        // Parse the clarification answers
        const userAnswers = {};
        
        // Extract user role breakdown
        const reliabilityMatch = userMessage.match(/(\d+)\s*reliability\s*engineers?/i);
        const supervisorMatch = userMessage.match(/(\d+)\s*supervisors?/i);
        const techMatch = userMessage.match(/(\d+)\s*(?:field\s*)?techs?(?:nicians?)?/i);
        const officeMatch = userMessage.match(/(\d+)\s*office\s*staff/i);
        
        if (reliabilityMatch || supervisorMatch || techMatch) {
          const premium = reliabilityMatch ? parseInt(reliabilityMatch[1], 10) : 0;
          const base = supervisorMatch ? parseInt(supervisorMatch[1], 10) : 0;
          const limited = (techMatch ? parseInt(techMatch[1], 10) : 0) + (officeMatch ? parseInt(officeMatch[1], 10) : 0);
          
          userAnswers.roles = { premium, base, limited };
        }
        
        // Check for greenfield vs migration
        const isGreenfield = /greenfield|new|no existing|don't have|do not have/i.test(userMessage);
        const isMigration = /replacing|migrating|currently|existing|have.*system/i.test(userMessage);
        
        // Build the configuration
        const config = buildConversationalQuote(quoteBuilderContext.data, userAnswers);
        
        // Calculate estimate using pricing engine
        const estimate = calculateEstimate(config);
        
        // Format the response
        const industryName = config.industry ?
          (config.industry === 'oil-gas' ? 'Oil & Gas' :
           config.industry === 'civil-infrastructure' ? 'Civil Infrastructure' :
           config.industry.charAt(0).toUpperCase() + config.industry.slice(1)) : 'General';
        
        const moduleNames = config.selectedModules.map(m => {
          const names = {
            manage: 'Manage',
            health: 'Health',
            monitor: 'Monitor',
            predict: 'Predict',
            visualInspection: 'Visual Inspection',
            assist: 'Assist'
          };
          return names[m] || m;
        }).join(', ');
        
        const totalUsers =
          (config.userMix.premium.concurrent || 0) +
          (config.userMix.base.concurrent || 0) +
          (config.userMix.limited.concurrent || 0);
        
        // Reset quote builder context
        setQuoteBuilderContext(null);
        
        return {
          answer: `Here's what I'd configure:

**Industry:** ${industryName}
**Modules:** ${moduleNames}
**Deployment:** MAS SaaS (${config.edition} edition)

**Users:**
• Premium: ${config.userMix.premium.concurrent} concurrent
• Base: ${config.userMix.base.concurrent} concurrent
• Limited: ${config.userMix.limited.concurrent} concurrent
• **Total:** ${totalUsers} concurrent users

**Environments:**
• Production: 1 Small environment
${config.environments.nonProd ? '• Non-Production: 1 XS environment' : ''}

**Contract Term:** ${config.contractTerm} year(s)

**Estimated AppPoints:** ${estimate.totalAppPoints?.toLocaleString() || 'Calculating...'}
**Indicative Annual Pricing:** $${estimate.totalCost ? (estimate.totalCost / config.contractTerm).toLocaleString() : 'Calculating...'}

${isGreenfield ? '💡 Since this is greenfield, consider a phased rollout approach.' : ''}
${isMigration ? '💡 For migration projects, factor in data migration and change management.' : ''}`,
          sources: [],
          confidence: 90,
          hasEstimate: true,
          estimateConfig: config,
          isQuoteBuilder: true
        };
      }
    }
    
    return null;
  };

  const buildIntentBasedEstimate = (question) => {
    const detectedIndustry = INDUSTRY_PATTERNS.find(({ regex }) => regex.test(question))?.value || formData.industry || '';
    const recommendedModules = Array.from(new Set(
      MODULE_RECOMMENDATIONS
        .filter(({ regex }) => regex.test(question))
        .flatMap(({ modules }) => modules)
    ));

    const userCountMatch = question.match(/(\d+)\s*(users?|technicians?|workers?|employees?)/i);
    const userCount = userCountMatch ? parseInt(userCountMatch[1], 10) : 0;

    const selectedApplications = recommendedModules.length > 0 ? recommendedModules : ['manage'];

    const estimatedUserMix = {
      premium: { concurrent: userCount > 0 ? Math.round(userCount * 0.2) : 5, authorized: 0 },
      base: { concurrent: userCount > 0 ? Math.round(userCount * 0.6) : 15, authorized: 0 },
      limited: { concurrent: userCount > 0 ? Math.round(userCount * 0.2) : 10, authorized: 0 },
      selfService: { concurrent: 0, authorized: 0 }
    };

    return {
      industry: detectedIndustry,
      industrySolutions: detectedIndustry ? [detectedIndustry === 'oil-gas' ? 'oilGas' : detectedIndustry === 'civil-infrastructure' ? 'civilInfrastructure' : detectedIndustry === 'energy' ? 'utilities' : detectedIndustry] : [],
      deploymentModel: 'saas',
      edition: userCount > 100 ? 'standard' : 'essentials',
      selectedApplications,
      selectedModules: selectedApplications,
      selectedAddons: [],
      userMix: estimatedUserMix,
      contractTerm: /5[- ]year|five year/i.test(question) ? 5 : /1[- ]year|one year/i.test(question) ? 1 : 3
    };
  };

  const getFallbackResponse = (question) => {
    const lowerQuestion = question.toLowerCase();

    const scenarioResponse = buildScenarioResponse(question);
    if (scenarioResponse) {
      return scenarioResponse;
    }
    
    // Handle ROI story questions
    if (/roi|return on investment|business case|value story/i.test(lowerQuestion)) {
      // Check if there's a recent estimate with industry context
      const lastEstimateMessage = messages.slice().reverse().find(m => m.role === 'assistant' && m.hasEstimate && m.estimateConfig);
      const industry = lastEstimateMessage?.estimateConfig?.industry || '';
      
      const industryROI = {
        'oil-gas': {
          story: `**ROI Story for Oil & Gas:**

**Key Value Drivers:**
• **Reduced Unplanned Downtime:** Predictive maintenance can reduce unplanned downtime by 30-50%, critical for high-value assets like rigs and refineries
• **Extended Asset Life:** Better maintenance planning extends equipment life by 20-30%
• **Safety & Compliance:** Automated inspection and maintenance tracking reduces safety incidents and regulatory fines
• **Operational Efficiency:** Mobile workforce management reduces travel time and improves first-time fix rates by 25%

**Typical Payback:** 12-18 months for integrated EAM+APM deployments

**Quantifiable Benefits:**
• $2-5M annual savings per major facility from downtime reduction
• 15-25% reduction in maintenance costs
• 40-60% improvement in asset utilization`,
          confidence: 88
        },
        'aviation': {
          story: `**ROI Story for Aviation:**

**Key Value Drivers:**
• **Aircraft Availability:** Improved maintenance planning increases aircraft availability by 5-10%
• **Regulatory Compliance:** Automated compliance tracking reduces audit preparation time by 60%
• **Parts Optimization:** Better inventory management reduces parts carrying costs by 20-30%
• **Turnaround Time:** Optimized maintenance scheduling reduces aircraft turnaround time by 15-25%

**Typical Payback:** 18-24 months

**Quantifiable Benefits:**
• $500K-2M per aircraft annually from improved availability
• 30-40% reduction in compliance-related delays
• 20-25% reduction in inventory carrying costs`,
          confidence: 87
        },
        'utilities': {
          story: `**ROI Story for Utilities:**

**Key Value Drivers:**
• **Grid Reliability:** Predictive maintenance reduces outages by 25-40%
• **Regulatory Compliance:** Automated asset tracking and maintenance records reduce compliance costs
• **Workforce Optimization:** Mobile solutions improve field crew productivity by 20-30%
• **Asset Performance:** Condition-based maintenance extends transformer and equipment life by 15-25%

**Typical Payback:** 12-18 months

**Quantifiable Benefits:**
• $1-3M annual savings per service territory from outage reduction
• 25-35% improvement in crew productivity
• 15-20% reduction in emergency maintenance costs`,
          confidence: 86
        },
        'manufacturing': {
          story: `**ROI Story for Manufacturing:**

**Key Value Drivers:**
• **Production Uptime:** Predictive maintenance increases OEE (Overall Equipment Effectiveness) by 10-20%
• **Maintenance Cost Reduction:** Shift from reactive to preventive maintenance reduces costs by 25-35%
• **Quality Improvement:** Better equipment maintenance reduces defect rates by 15-25%
• **Inventory Optimization:** Improved parts planning reduces MRO inventory by 20-30%

**Typical Payback:** 12-15 months

**Quantifiable Benefits:**
• $500K-2M per plant annually from uptime improvements
• 20-30% reduction in maintenance labor costs
• 15-25% reduction in spare parts inventory`,
          confidence: 85
        }
      };
      
      if (industry && industryROI[industry]) {
        return {
          answer: industryROI[industry].story,
          sources: [],
          confidence: industryROI[industry].confidence
        };
      }
      
      // Generic ROI story if no industry context
      return {
        answer: `**General Maximo ROI Story:**

**Key Value Drivers Across Industries:**
• **Reduced Downtime:** 20-40% reduction in unplanned downtime through predictive maintenance
• **Lower Maintenance Costs:** 15-30% reduction in overall maintenance costs
• **Extended Asset Life:** 15-25% increase in asset lifespan
• **Improved Productivity:** 20-35% improvement in workforce productivity with mobile solutions
• **Better Compliance:** 50-70% reduction in compliance-related issues

**Typical Payback Period:** 12-24 months depending on deployment scope

**How to Build Your Business Case:**
1. Quantify current downtime costs (lost production, emergency repairs)
2. Calculate maintenance labor inefficiencies (travel time, manual processes)
3. Assess inventory carrying costs and stockout impacts
4. Factor in compliance risks and safety incident costs
5. Model the improvement potential with Maximo capabilities

Would you like me to tailor this ROI story to a specific industry?`,
        sources: [],
        confidence: 82
      };
    }

    // Handle the "new customer interested" prompt specifically
    if (/new customer interested in maximo/i.test(question)) {
      return {
        answer: `Great! Here's how I can help you with a new Maximo opportunity:

**Discovery Questions to Ask:**
• What assets are they managing? (facilities, equipment, infrastructure, IT assets)
• What's their biggest pain point? (reactive maintenance, compliance, downtime, manual processes)
• How many maintenance/operations staff will use the system?
• Do they have IoT sensors or want predictive capabilities?
• Any specific industry requirements? (aviation, utilities, oil & gas, etc.)

**Common Starting Points:**
• **Core EAM:** Start with Maximo Manage for work orders, assets, and inventory
• **Mobile workforce:** Add Mobile for field technicians
• **Predictive maintenance:** Consider Health (scoring) or Predict (AI forecasting)
• **IoT monitoring:** Add Monitor for real-time sensor data

**Next Steps:**
Once you understand their needs, describe the scenario to me and I'll create a quote-ready estimate. For example: "Manufacturing company, 150 users, needs mobile work orders and predictive maintenance, 3-year deal."`,
        sources: [],
        confidence: null
      };
    }

    if (entryMode === 'chat' && (
      /client|customer|needs|wants|looking for|users?|estimate|recommend/i.test(question)
    )) {
      const config = buildIntentBasedEstimate(question);
      const moduleLabels = config.selectedApplications.join(', ');
      const totalUsers =
        (config.userMix.premium.concurrent || 0) +
        (config.userMix.base.concurrent || 0) +
        (config.userMix.limited.concurrent || 0);

      const solutionLabels = (config.advisoryContext?.recommendedSolutions || []).length > 0
        ? config.advisoryContext.recommendedSolutions.join(', ')
        : 'None';

      return {
        answer: `I translated that into a draft estimate configuration.

Recommended industry: ${config.industry || 'general'}
Recommended modules: ${moduleLabels}
Suggested solution context: ${solutionLabels}
Deployment: MAS SaaS
Edition: ${config.edition}
Estimated concurrent users: ${totalUsers}
Contract term: ${config.contractTerm} year(s)

Note: industry and solution context are advisory. They help guide discovery and module recommendations, but are not being positioned here as direct billable AppPoints items.

Open this in the estimator to review, refine, and price it.`,
        sources: [],
        confidence: 84,
        estimateConfig: config,
        hasEstimate: true
      };
    }

    if (entryMode === 'guided' && (
      lowerQuestion.includes('what should i do') ||
      lowerQuestion.includes('help me with this step') ||
      lowerQuestion.includes('what next') ||
      lowerQuestion.includes('current step')
    )) {
      return getStepCoachingResponse();
    }

    if (lowerQuestion.includes('health') || lowerQuestion.includes('asset health')) {
      return {
        answer: 'Maximo Health provides asset health scoring and risk-based maintenance. It helps customers prioritize maintenance based on asset condition and business criticality.',
        sources: [],
        confidence: null
      };
    }

    if (lowerQuestion.includes('monitor')) {
      return {
        answer: 'Maximo Monitor delivers real-time IoT monitoring and anomaly detection. It is best for customers with critical assets and sensor data who need earlier issue detection.',
        sources: [],
        confidence: null
      };
    }

    if (lowerQuestion.includes('predict')) {
      return {
        answer: 'Maximo Predict uses AI to forecast failures and estimate remaining useful life. It is valuable when the customer has historical failure patterns and wants proactive maintenance planning.',
        sources: [],
        confidence: null
      };
    }

    if (lowerQuestion.includes('manage')) {
      return {
        answer: 'Maximo Manage is the required core EAM module. It supports work, asset, inventory, and maintenance management and serves as the platform foundation for the other modules.',
        sources: [],
        confidence: null
      };
    }

    if (lowerQuestion.includes('saas') || lowerQuestion.includes('deployment')) {
      return {
        answer: 'This V3 estimator is scoped for Maximo Application Suite SaaS only. Use this step to size SaaS edition, infrastructure, database, and environments for the customer.',
        sources: [],
        confidence: null
      };
    }

    if (lowerQuestion.includes('apppoint') || lowerQuestion.includes('pricing')) {
      return {
        answer: 'AppPoints are based on concurrent usage, not named users. Premium users consume 15 points, Base users 10, Limited users 5, and Self-Service users 0.',
        sources: [],
        confidence: null
      };
    }

    if (lowerQuestion.includes('test estimate') || lowerQuestion.includes('sample config')) {
      return {
        answer: `Here is the final MAS SaaS configuration for Maximo Manage including AppPoints: 7448

Base Install: 100
User AppPoints: 190
Aviation Solution AppPoints: 900
Optimizer AppPoints: 5000
EDR AppPoints: 1258

Indicative Pricing for 1 year: USD 1,989,509.76`,
        sources: [],
        confidence: null
      };
    }

    return {
      answer: `${getContextSummary()}

I can help with:
• Recommend Maximo modules from customer needs
• Use industry and solution context as advisory guidance
• Translate plain-English requirements into MAS SaaS estimator inputs
• Explain AppPoints and pricing drivers
• Answer Maximo product and competitive questions
• Create an estimate you can open in the estimator

💡 Tip: describe the customer need in one sentence, or type "test estimate" to see the estimator handoff.`,
      sources: [],
      confidence: null
    };
  };

  const sendMessage = async (rawMessage) => {
    if (!rawMessage.trim() || isLoading) return;

    const userMessage = rawMessage.trim();
    console.log('=== SEND MESSAGE START ===');
    console.log('sendMessage called with:', userMessage);
    console.log('Version: 2024-04-16-v3');
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const lowerMessage = userMessage.toLowerCase();
      
      // Check for ROI questions FIRST (these should work after any estimate)
      if (/roi|return on investment|business case|value story/i.test(lowerMessage)) {
        console.log('ROI question detected');
        const roiResponse = getFallbackResponse(userMessage);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: roiResponse.answer,
            sources: roiResponse.sources || [],
            confidence: roiResponse.confidence ?? null
          }
        ]);
        setIsLoading(false);
        return;
      }
      
      // Check for estimate refinement (if there's a previous estimate)
      console.log('Checking for estimate refinement...');
      const lastAssistantMessage = messages.slice().reverse().find(m => m.role === 'assistant' && m.hasEstimate);
      if (lastAssistantMessage && lastAssistantMessage.estimateConfig) {
        const refinementResponse = handleEstimateRefinement(userMessage, lastAssistantMessage.estimateConfig);
        if (refinementResponse) {
          console.log('Refinement response generated');
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: refinementResponse.answer,
              sources: refinementResponse.sources || [],
              confidence: refinementResponse.confidence ?? null,
              hasEstimate: refinementResponse.hasEstimate || false,
              estimateConfig: refinementResponse.estimateConfig || null,
              isRefinement: refinementResponse.isRefinement || false
            }
          ]);
          setIsLoading(false);
          return;
        }
      }
      
      // Check for conversational quote builder
      console.log('Checking for conversational quote builder...');
      const quoteBuilderResponse = handleConversationalQuoteBuilder(userMessage);
      if (quoteBuilderResponse) {
        console.log('Quote builder response generated');
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: quoteBuilderResponse.answer,
            sources: quoteBuilderResponse.sources || [],
            confidence: quoteBuilderResponse.confidence ?? null,
            hasEstimate: quoteBuilderResponse.hasEstimate || false,
            estimateConfig: quoteBuilderResponse.estimateConfig || null,
            isQuoteBuilder: quoteBuilderResponse.isQuoteBuilder || false
          }
        ]);
        setIsLoading(false);
        return;
      }
      
      // Check for shorthand calculation
      console.log('Checking for shorthand pattern...');
      
      // Detect if this looks like a shorthand config input
      const hasShorthandPattern = /\b(prod|premium|base|limited)\s+(l|m|h|limited|medium|high)?\s*\d+/i.test(userMessage) ||
                                  /\b(aviation|civil|nuclear|power|oil|gas|transportation|utilities|manufacturing)\b/i.test(userMessage);
      
      if (hasShorthandPattern) {
        console.log('Shorthand pattern detected! Calculating estimate...');
        console.log('Input message:', userMessage);
        const calculation = calculateFromShorthand(userMessage);
        console.log('Calculation result:', calculation);
        
        if (calculation.success) {
          console.log('Calculation successful! Showing estimate.');
          // Return the formatted estimate with AppPoints breakdown
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: calculation.formatted,
              sources: [],
              confidence: null,
              hasEstimate: true,
              estimateConfig: calculation.config
            }
          ]);
          setIsLoading(false);
          return;
        } else {
          // If parsing failed, show error but continue to RAG
          console.log('Shorthand parsing failed:', calculation.error);
        }
      }
      
      // Check for test trigger - bypass RAG for demo
      if (lowerMessage.includes('test estimate') || lowerMessage.includes('sample config')) {
        console.log('Test trigger detected! Using fallback response');
        const fallback = getFallbackResponse(userMessage);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: fallback.answer,
            sources: fallback.sources || [],
            confidence: fallback.confidence ?? null,
            hasEstimate: fallback.hasEstimate || false,
            estimateConfig: fallback.estimateConfig || null
          }
        ]);
        setIsLoading(false);
        return;
      }

      const localScenarioResponse = getFallbackResponse(userMessage);
      const isScenarioSpecificPrompt =
        /poc|proof of concept|inspection|inspections?|visual inspection|free month|free trial|trial month|delayed billing|13[- ]for[- ]12|asset management|track assets, work orders, and inventory|predict failures and reduce downtime|enable mobile technicians in the field|build a full apm stack|i'm not sure|im not sure|help me figure it out/i.test(userMessage);
      const shouldPreferLocalScenario =
        isScenarioSpecificPrompt ||
        localScenarioResponse?.hasEstimate ||
        (localScenarioResponse?.optionCards && localScenarioResponse.optionCards.length > 0) ||
        (localScenarioResponse?.sources && localScenarioResponse.sources.length > 0);

      if (shouldPreferLocalScenario) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: localScenarioResponse.answer,
            sources: localScenarioResponse.sources || [],
            confidence: localScenarioResponse.confidence ?? null,
            hasEstimate: localScenarioResponse.hasEstimate || false,
            estimateConfig: localScenarioResponse.estimateConfig || null,
            optionCards: localScenarioResponse.optionCards || []
          }
        ]);
        setIsLoading(false);
        return;
      }

      const knowledgeResponse = buildDemoKnowledgeResponse(userMessage);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: knowledgeResponse.answer,
          sources: knowledgeResponse.sources || [],
          confidence: knowledgeResponse.confidence ?? null
        }
      ]);
    } catch (error) {
      const fallback = getFallbackResponse(userMessage);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: fallback.answer,
          sources: fallback.sources || [],
          confidence: fallback.confidence ?? null,
          hasEstimate: fallback.hasEstimate || false,
          estimateConfig: fallback.estimateConfig || null,
          optionCards: fallback.optionCards || []
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    await sendMessage(input);
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <aside className="chat-sidebar">
      <div className="chat-sidebar__header">
        <div>
          <h3 className="chat-sidebar__title">Maximo Assistant</h3>
        </div>
        <div className="ai-slug">
          <span>AI</span>
        </div>
      </div>

      <div className="chat-sidebar__messages">
        {/* Always show cold start UI at the top */}
        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="chat-message assistant" style={{ margin: 0, padding: '0.75rem' }}>
            <div className="message-content" style={{ fontSize: '0.875rem', lineHeight: '1.4' }}>
              Welcome! I'm here to help you sell Maximo.
              <br /><br />
              Ask me anything — product questions, licensing rules, competitive positioning, or help structuring a deal.
              <br /><br />
              You can also use the estimator on the left to build your quote step by step — I'll stay here if you need help along the way.
            </div>
          </div>

          <div style={{ padding: '0.75rem', backgroundColor: '#FFFFFF', borderRadius: '4px', border: '1px solid #d0d0d0' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#161616' }}>Build a quote with chat</h4>
            <p style={{ fontSize: '0.8rem', lineHeight: '1.4', color: '#525252', marginBottom: '0.5rem' }}>
              Describe your deal in plain language — customer industry, their needs, user count, and any special requirements. The assistant will recommend modules, calculate AppPoints, and create a complete estimate ready for the estimator.
            </p>
            <p style={{ fontSize: '0.8rem', lineHeight: '1.4', color: '#525252', fontStyle: 'italic' }}>
              Example: "Large oil and gas company needs asset management with IoT monitoring on their rigs. About 200 maintenance staff. Quote for 3 years."
            </p>
          </div>

          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#161616' }}>Or explore first</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {COLD_START_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="chat-suggestion-chip"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.5)',
                    color: '#0f62fe',
                    border: '1px solid #d0d0d0',
                    borderRadius: '4px',
                    padding: '0.5rem 0.75rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 400,
                    transition: 'all 0.15s ease',
                    lineHeight: '1.3'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
                    e.currentTarget.style.borderColor = '#0f62fe';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                    e.currentTarget.style.borderColor = '#d0d0d0';
                  }}
                  onClick={() => sendMessage(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {messages.map((message, index) => {
          // Check if message has estimate - either from detection or explicit flag
          const hasEstimate = message.hasEstimate ||
                             (message.role === 'assistant' && detectEstimateInMessage(message.content));
          
          // Get config - either from message or parse from content
          const estimateConfig = message.estimateConfig ||
                                (hasEstimate ? parseChatConfig(message.content) : null);
          
          return (
            <div key={index} className={`chat-message ${message.role}`}>
              <div className="message-content" style={{ whiteSpace: 'pre-wrap' }}>
                {message.content}
              </div>

              {message.optionCards && message.optionCards.length > 0 && (
                <div
                  className="message-option-cards"
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    marginTop: '1rem'
                  }}
                >
                  {message.optionCards.map((option) => (
                    <Tile
                      key={option.prompt}
                      as="button"
                      type="button"
                      onClick={() => sendMessage(option.prompt)}
                      style={{
                        minWidth: '220px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        border: '1px solid #c6c6c6',
                        background: '#ffffff'
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{option.title}</div>
                      <div style={{ fontSize: '0.875rem', color: '#525252' }}>{option.prompt}</div>
                    </Tile>
                  ))}
                </div>
              )}

              {message.warning && (
                <div className="message-warning">{message.warning}</div>
              )}

              {hasEstimate && estimateConfig && (
                <div className="message-estimate-actions" style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  backgroundColor: '#f4f4f4',
                  borderRadius: '4px',
                  display: 'flex',
                  gap: '0.5rem',
                  flexWrap: 'wrap'
                }}>
                  <Button
                    kind="primary"
                    size="sm"
                    renderIcon={ArrowRight}
                    onClick={() => handleOpenInEstimator(estimateConfig)}
                  >
                    Open in Estimator
                  </Button>
                  <Button
                    kind="secondary"
                    size="sm"
                    renderIcon={Copy}
                    onClick={() => handleCopyConfig(message.content)}
                  >
                    Copy Config
                  </Button>
                  <Tag type="blue" size="md">
                    📊 Estimate Detected
                  </Tag>
                </div>
              )}

              {message.sources && message.sources.length > 0 && (
              <div className="message-sources">
                <div className="message-sources__title">
                  <Book size={16} />
                  <span>Sources</span>
                </div>
                {message.sources.map((source, sourceIndex) => (
                  <div key={`${source.doc_name}-${sourceIndex}`} className="source-item">
                    <a
                      href={source.url || '#demo-source'}
                      className="source-doc source-doc-link"
                      title="Demo source document"
                    >
                      {source.doc_name}
                    </a>
                    <span className="source-section">{source.section}</span>
                    <Tag type="blue" size="sm">
                      Seismic
                    </Tag>
                    {source.confidence !== undefined && source.confidence !== null && (
                      <Tag type="outline" size="sm">
                        {Math.round(source.confidence)}%
                      </Tag>
                    )}
                  </div>
                ))}
              </div>
            )}

              {message.confidence !== null && message.confidence !== undefined && (
                <div className="message-confidence">
                  Confidence: {Math.round(message.confidence)}%
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="chat-message assistant">
            <div className="message-content loading">
              <InlineLoading description="Thinking…" status="active" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-sidebar__gradient"></div>

      <div className="chat-sidebar__composer">
        <div className="chat-composer__input-wrapper">
          <TextArea
            id="chat-input"
            labelText=""
            hideLabel
            placeholder={entryMode === 'guided'
              ? 'Ask for MAS SaaS step guidance, objections, talk tracks, pricing help, or competitive context...'
              : 'Describe the customer need for a MAS SaaS estimate'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            rows={1}
            disabled={isLoading}
          />
          <IconButton
            kind="ghost"
            label="Send message"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="chat-composer__send-button"
          >
            <Send size={20} />
          </IconButton>
        </div>
        <div className="chat-composer__actions">
          <IconButton kind="ghost" label="Add attachment" size="sm">
            <Add size={20} />
          </IconButton>
          <IconButton kind="ghost" label="Start conversation" size="sm">
            <Chat size={20} />
          </IconButton>
          <IconButton kind="ghost" label="Voice input" size="sm">
            <Microphone size={20} />
          </IconButton>
          <IconButton kind="ghost" label="Quick actions" size="sm">
            <Flash size={20} />
          </IconButton>
          <IconButton kind="ghost" label="Code snippet" size="sm">
            <Code size={20} />
          </IconButton>
        </div>
      </div>
    </aside>
  );
}

export default ChatInterface;

// Made with Bob

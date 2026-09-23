import { calculateEstimate } from '../imports/calculateEstimate';
import { APPLICATIONS } from '../imports/constants';
import type { FormData } from '../types';

/**
 * Conversational Quote Builder — pure logic ported and cleaned from the orphaned
 * `src/imports/ChatInterface.jsx`. Everything here is framework-free and typed to
 * this project's real `FormData` + `calculateEstimate` engine, so an applied quote
 * drives the live estimator.
 */

export type QuoteStage = 'idle' | 'initial' | 'clarifying';

export interface QuoteCtx {
  stage: QuoteStage;
  deal?: ParsedDeal;
}

interface ParsedDeal {
  industry: string;
  userCount: number;
  modules: string[];
  contractTerm: number;
  hasExistingSystem: boolean;
  existingSystem: string | null;
  rawDescription: string;
}

interface ClarifyingAnswers {
  roleCounts?: { premium: number; base: number; limited: number };
  greenfield: boolean;
  migration: boolean;
}

// Industry patterns, normalized to ConfigForm's INDUSTRIES ids.
const INDUSTRY_PATTERNS: { regex: RegExp; value: string }[] = [
  { regex: /aviation|airline|airport/i, value: 'aviation' },
  { regex: /nuclear|power generation/i, value: 'nuclear' },
  { regex: /utilities|utility|water|electric/i, value: 'energy' },
  { regex: /oil\s*&\s*gas|oil and gas|refinery|upstream|downstream/i, value: 'oilgas' },
  { regex: /transport|rail|fleet|logistics/i, value: 'transportation' },
  { regex: /civil|infrastructure|roads|bridges/i, value: 'civil' },
  { regex: /manufacturing|plant|factory/i, value: 'manufacturing' },
  { regex: /life sciences|pharma|biotech/i, value: 'lifesciences' },
  { regex: /government|defense|public sector/i, value: 'government' },
];

const VALID_APP_IDS = new Set(APPLICATIONS.map((a) => a.id));

// Module recommendations, filtered to valid APPLICATIONS ids.
const MODULE_RECOMMENDATIONS: { regex: RegExp; modules: string[] }[] = [
  { regex: /asset management|eam|work orders?|maintenance management/i, modules: ['manage'] },
  { regex: /monitor|iot|sensors?|condition monitoring|real[- ]time monitoring/i, modules: ['manage', 'monitor'] },
  { regex: /predict|predictive maintenance|failure prediction/i, modules: ['manage', 'health', 'predict'] },
  { regex: /health|asset health|risk based maintenance/i, modules: ['manage', 'health'] },
  { regex: /visual inspection|computer vision|inspection/i, modules: ['visualInspection'] },
  { regex: /collaborat|mobile workflow|team/i, modules: ['collaborate'] },
];

const APP_LABELS: Record<string, string> = {
  manage: 'Manage',
  health: 'Health',
  predict: 'Predict',
  monitor: 'Monitor',
  visualInspection: 'Visual Inspection',
  collaborate: 'Collaborate',
};

const INDUSTRY_LABELS: Record<string, string> = {
  aviation: 'Aviation',
  nuclear: 'Nuclear',
  energy: 'Energy & Utilities',
  oilgas: 'Oil & Gas',
  transportation: 'Transportation',
  civil: 'Civil Infrastructure',
  manufacturing: 'Manufacturing',
  lifesciences: 'Life Sciences',
  government: 'Government',
  other: 'General',
};

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function clampTerm(term: number): 1 | 3 | 5 {
  if (term >= 5) return 5;
  if (term >= 3) return 3;
  return 1;
}

function sizeForUserCount(count: number): 'small' | 'medium' | 'large' | 'enterprise' {
  if (count >= 1000) return 'enterprise';
  if (count >= 300) return 'large';
  if (count >= 50) return 'medium';
  return 'small';
}

function zeroedForm(): FormData {
  return {
    estimateName: 'New quote',
    companyName: '',
    industry: 'other',
    deploymentModel: 'saas',
    selectedApplications: [],
    environmentSize: 'small',
    environments: { prod: { size: 'small', count: 1 } },
    userMix: {
      premium: { concurrent: 0, authorized: 0 },
      base: { concurrent: 0, authorized: 0 },
      limited: { concurrent: 0, authorized: 0 },
      selfService: { concurrent: 0, authorized: 0 },
    },
    licensingModel: 'concurrent',
    selectedAddons: [],
    advancedComponents: {},
    database: { type: 'db2', replicas: 0 },
    deploymentArchitecture: 'shared',
    contractTerm: 1,
  };
}

export function parseInitialDealDescription(description: string): ParsedDeal {
  const lowerDesc = description.toLowerCase();

  const industry = INDUSTRY_PATTERNS.find(({ regex }) => regex.test(description))?.value || 'other';

  const userCountMatch = description.match(/(\d+)\s*(users?|technicians?|workers?|employees?|staff)/i);
  const userCount = userCountMatch ? parseInt(userCountMatch[1], 10) : 0;

  const recommended = Array.from(
    new Set(
      MODULE_RECOMMENDATIONS.filter(({ regex }) => regex.test(description)).flatMap(({ modules }) => modules),
    ),
  ).filter((m) => VALID_APP_IDS.has(m));

  const termMatch = description.match(/(\d+)[- ]year/i);
  const contractTerm = termMatch ? parseInt(termMatch[1], 10) : 3;

  const hasExistingSystem = /replacing|migrating from|currently using|have|existing/i.test(lowerDesc);
  const existingSystemMatch = description.match(
    /(?:replacing|migrating from|currently using|have)\s+([A-Z][A-Za-z\s]+?)(?:\.|,|$|\s+PM|\s+EAM)/i,
  );
  const existingSystem = existingSystemMatch ? existingSystemMatch[1].trim() : null;

  return {
    industry,
    userCount,
    modules: recommended.length > 0 ? recommended : ['manage'],
    contractTerm,
    hasExistingSystem,
    existingSystem,
    rawDescription: description,
  };
}

export function parseClarifyingAnswers(message: string): ClarifyingAnswers {
  const reliabilityMatch = message.match(/(\d+)\s*reliability\s*engineers?/i);
  const supervisorMatch = message.match(/(\d+)\s*supervisors?/i);
  const techMatch = message.match(/(\d+)\s*(?:field\s*)?techs?(?:nicians?)?/i);
  const officeMatch = message.match(/(\d+)\s*office\s*staff/i);

  let roleCounts: ClarifyingAnswers['roleCounts'];
  if (reliabilityMatch || supervisorMatch || techMatch || officeMatch) {
    roleCounts = {
      premium: reliabilityMatch ? parseInt(reliabilityMatch[1], 10) : 0,
      base: supervisorMatch ? parseInt(supervisorMatch[1], 10) : 0,
      limited:
        (techMatch ? parseInt(techMatch[1], 10) : 0) + (officeMatch ? parseInt(officeMatch[1], 10) : 0),
    };
  }

  return {
    roleCounts,
    greenfield: /greenfield|new|no existing|don't have|do not have/i.test(message),
    migration: /replacing|migrating|currently|existing|have.*system/i.test(message),
  };
}

export function buildQuoteFormData(deal: ParsedDeal, answers: ClarifyingAnswers): FormData {
  const form = zeroedForm();
  const userCount = deal.userCount || 0;

  form.estimateName = INDUSTRY_LABELS[deal.industry] ? `${INDUSTRY_LABELS[deal.industry]} quote` : 'New quote';
  form.industry = deal.industry;
  form.selectedApplications = deal.modules.length > 0 ? deal.modules : ['manage'];
  form.contractTerm = clampTerm(deal.contractTerm);

  const size = sizeForUserCount(userCount);
  form.environmentSize = size;
  form.environments = { prod: { size, count: 1 } };
  if (!answers.greenfield) {
    form.environments.nonProd = { xs: 1 };
  }

  const roles = answers.roleCounts;
  const premium = roles ? roles.premium : Math.round(userCount * 0.15);
  const base = roles ? roles.base : Math.round(userCount * 0.6);
  const limited = roles ? roles.limited : Math.max(0, userCount - premium - base);

  form.userMix.premium.concurrent = premium;
  form.userMix.base.concurrent = base;
  form.userMix.limited.concurrent = limited;

  return form;
}

export function applyRefinement(message: string, prev: FormData): FormData | null {
  const next: FormData = {
    ...prev,
    selectedApplications: [...prev.selectedApplications],
    environments: {
      ...prev.environments,
      prod: { ...prev.environments.prod },
      nonProd: prev.environments.nonProd ? { ...prev.environments.nonProd } : undefined,
    },
    userMix: {
      premium: { ...prev.userMix.premium },
      base: { ...prev.userMix.base },
      limited: { ...prev.userMix.limited },
      selfService: { ...prev.userMix.selfService },
    },
  };
  let changed = false;

  if (/add.*non[- ]prod|include.*non[- ]prod/i.test(message)) {
    next.environments.nonProd = { xs: 1, ...(next.environments.nonProd || {}) };
    changed = true;
  }

  const bump = (tier: 'premium' | 'base' | 'limited') => {
    const m = message.match(
      new RegExp(`(?:bump|increase).*${tier}.*to\\s+(\\d+)|${tier}.*to\\s+(\\d+)`, 'i'),
    );
    if (m) {
      next.userMix[tier].concurrent = parseInt(m[1] || m[2], 10);
      changed = true;
    }
  };
  bump('premium');
  bump('base');
  bump('limited');

  const termMatch = message.match(/change.*term.*to\s+(\d+)|make.*it\s+(\d+)\s+year|(\d+)[- ]year\s+deal/i);
  if (termMatch) {
    next.contractTerm = clampTerm(parseInt(termMatch[1] || termMatch[2] || termMatch[3], 10));
    changed = true;
  }

  // Map each module id to a matcher that also accepts spaced/natural phrasing
  // (e.g. "visualInspection" ← "visual inspection").
  const MODULE_ALIASES: Record<string, string> = {
    health: 'health',
    monitor: 'monitor',
    predict: 'predict',
    collaborate: 'collaborate',
    visualInspection: 'visual\\s*inspection',
  };
  (Object.keys(MODULE_ALIASES) as (keyof typeof MODULE_ALIASES)[]).forEach((id) => {
    if (
      new RegExp(`add.*${MODULE_ALIASES[id]}`, 'i').test(message) &&
      !next.selectedApplications.includes(id)
    ) {
      next.selectedApplications.push(id);
      changed = true;
    }
  });

  return changed ? next : null;
}

function formatQuote(form: FormData, heading: string, notes?: string): string {
  const est = calculateEstimate(form);
  const annual = est.annualCost;
  const totalUsers =
    form.userMix.premium.concurrent + form.userMix.base.concurrent + form.userMix.limited.concurrent;
  const modules = form.selectedApplications.map((m) => APP_LABELS[m] || m).join(', ');

  return `${heading}

Industry: ${INDUSTRY_LABELS[form.industry] || form.industry}
Modules: ${modules}
Deployment: MAS SaaS

Users (concurrent):
• Premium: ${form.userMix.premium.concurrent}
• Base: ${form.userMix.base.concurrent}
• Limited: ${form.userMix.limited.concurrent}
• Total: ${totalUsers} users

Environments:
• Production: 1 ${form.environments.prod.size} environment${
    form.environments.nonProd ? '\n• Non-Production: 1 XS environment' : ''
  }

Contract term: ${form.contractTerm} year(s)

Estimated AppPoints: ${est.totalAppPoints.toLocaleString()}
Indicative annual price: ${currency.format(annual)}${notes ? `\n\n${notes}` : ''}`;
}

const TRIGGER = /describe a deal|build.*quote|create.*quote|new deal|new opportunity/i;

export interface AdvanceResult {
  reply: string;
  nextCtx: QuoteCtx;
  formData?: FormData;
}

/**
 * State machine for the multi-turn quote builder. Returns null when the message
 * doesn't belong to a builder flow (caller should fall back to normal chat).
 */
export function advanceQuoteBuilder(ctx: QuoteCtx, message: string): AdvanceResult | null {
  // Entry: trigger the flow (works from idle even if regex would also match mid-flow).
  if (ctx.stage === 'idle') {
    if (!TRIGGER.test(message)) return null;
    return {
      reply: `Great — let's build a quote. Describe the deal in your own words: the customer's industry, what they need, how many users, and any special requirements.

For example: "Large oil and gas company, about 200 maintenance staff. They have IoT sensors on rigs and want AI inspection for pipeline welds. 3 year deal."`,
      nextCtx: { stage: 'initial' },
    };
  }

  if (ctx.stage === 'initial') {
    const deal = parseInitialDealDescription(message);
    const q1 =
      deal.hasExistingSystem && deal.existingSystem
        ? `1. You mentioned ${deal.existingSystem}. Is this a greenfield deployment or a migration from another CMMS?`
        : `1. Do they have an existing CMMS, or is this greenfield?`;
    const q2 =
      deal.userCount > 0
        ? `2. Beyond the ${deal.userCount} users, can you break down the roles? (e.g. reliability engineers, supervisors, field techs, office staff)`
        : `2. Who will use the system? (reliability engineers, supervisors, field techs, office staff)`;
    return {
      reply: `Got it. A couple of things to get this right:

${q1}

${q2}`,
      nextCtx: { stage: 'clarifying', deal },
    };
  }

  if (ctx.stage === 'clarifying' && ctx.deal) {
    const answers = parseClarifyingAnswers(message);
    const form = buildQuoteFormData(ctx.deal, answers);
    const notes = answers.greenfield
      ? '💡 Since this is greenfield, consider a phased rollout approach.'
      : answers.migration
        ? '💡 For migration projects, factor in data migration and change management.'
        : undefined;
    return {
      reply: formatQuote(form, "Here's what I'd configure:", notes),
      nextCtx: { stage: 'idle' },
      formData: form,
    };
  }

  return null;
}

export function refinementReply(form: FormData): string {
  return formatQuote(form, 'Updated quote:');
}

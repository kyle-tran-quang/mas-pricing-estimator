#!/usr/bin/env node
/**
 * pricing_engine.mjs — Maximo MAS AppPoints pricing engine (standalone).
 *
 * A self-contained, data-driven port of:
 *   - src/imports/calculateEstimate.js  (orchestrator + sub-calculators)
 *   - src/imports/constants.js          (pricing constants & lookups)
 *
 * All pricing lives in the tables below; the arithmetic never hardcodes a
 * per-item value, so adding a new module, tier, add-on, or environment size
 * is a one-line data change.
 *
 * Extensibility ("dynamic and scalable"):
 *   Each cost component is a pure function with a uniform signature
 *     (formData) => { total: number, breakdown: Array<{...}> }
 *   New components are registered in COMPONENT_CALCULATORS — calculateEstimate()
 *   itself is unchanged. The minimum-AppPoints floor runs separately because it
 *   depends on the running total (matching the original's ordering).
 *
 * Usage:
 *   node pricing_engine.mjs   # runs the built-in demo quote
 *   import { calculateEstimate } from './pricing_engine.mjs'
 */

// ── Constants (data tables) ──────────────────────────────────────────────

export const USER_TIER_APPPOINTS = {
  premium:     { label: 'Premium user',      concurrent: 25, authorized: 8 },
  base:        { label: 'Base user',         concurrent: 15, authorized: 5 },
  limited:     { label: 'Limited user',      concurrent: 8,  authorized: 3 },
  selfService: { label: 'Self-service user', concurrent: 4,  authorized: 1 },
};

export const APPLICATIONS = [
  { id: 'manage',           name: 'Managing assets, work orders, and maintenance', shortName: 'Manage', category: 'Comprehensive Asset Management', tags: ['Manage'], baseInstall: 200, minimumAppPoints: 0, color: 'purple' },
  { id: 'health',           name: 'Asset health insights and scoring',             shortName: 'Health', category: 'Asset Health Insights',        tags: ['Manage', 'Health'], baseInstall: 100, minimumAppPoints: 0, color: 'blue' },
  { id: 'predict',          name: 'Predict failures before they happen',           shortName: 'Predict', category: 'Predictive Maintenance & AI',    tags: ['Manage', 'Health', 'Predict'], baseInstall: 100, minimumAppPoints: 0, color: 'green' },
  { id: 'monitor',          name: 'Real-time monitoring of connected devices',      shortName: 'Monitor', category: 'IoT Device Monitoring',          tags: ['Manage', 'Monitor'], baseInstall: 50, minimumAppPoints: 0, color: 'cyan' },
  { id: 'visualInspection', name: 'Automated visual inspection with AI',           shortName: 'Visual Inspection', category: 'AI Visual Inspection', tags: ['Visual Inspection'], baseInstall: 50, minimumAppPoints: 0, color: 'teal' },
  { id: 'collaborate',      name: 'Team collaboration and mobile workflow',         shortName: 'Collaborate', category: 'Team Collaboration',          tags: ['Collaborate'], baseInstall: 50, minimumAppPoints: 0, color: 'magenta' },
];

export const ADDONS = [
  { id: 'transport-solution', name: 'Transportation Industry Solution', appPoints: 25 },
  { id: 'aviation-solution',   name: 'Aviation Industry Solution',       appPoints: 25 },
  { id: 'utilities-solution',   name: 'Energy & Utilities Industry Solution', appPoints: 25 },
];

export const ADVANCED_COMPONENTS = {
  optimizer: { name: 'Optimizer', appPoints: 20 },
  scheduler: { name: 'Scheduler', appPoints: 50 },
  mobile:    { name: 'Mobile',    appPoints: 0 },
  spatial:   { name: 'Spatial',   appPoints: 100 },
};

export const DATABASE_TYPES = {
  db2:       { name: 'Db2',        appPoints: 0 },
  oracle:    { name: 'Oracle',     appPoints: 40 },
  sqlserver: { name: 'SQL Server', appPoints: 30 },
};

export const DATABASE_REPLICA_APPPOINTS = 10;

export const DEPLOYMENT_ARCHITECTURE = {
  shared:    { name: 'Shared infrastructure',   appPoints: 0 },
  dedicated: { name: 'Dedicated infrastructure', appPoints: 60 },
};

export const ENVIRONMENT_SIZES = {
  small:      { label: 'Small',      appPoints: 0,   description: 'Under 300 employees' },
  medium:     { label: 'Medium',     appPoints: 30,  description: '300–3,000 employees' },
  large:      { label: 'Large',      appPoints: 75,  description: '3,000–25,000 employees' },
  enterprise: { label: 'Enterprise', appPoints: 150, description: '25,000+ employees' },
};

export const PRICING = {
  basePointCost: 150, // $ per AppPoint / year
  contractTermDiscounts: { 1: 0, 3: 0.12, 5: 0.20 },
};

// ── Lookup helpers ───────────────────────────────────────────────────────
// Dict-backed tables resolve by key in O(1); list tables are indexed once.

const _APP_BY_ID = APPLICATIONS.reduce((m, a) => ((m[a.id] = a), m), {});
const _ADDON_BY_ID = ADDONS.reduce((m, a) => ((m[a.id] = a), m), {});

export const getApplicationById = (id) => _APP_BY_ID[id] || null;
export const getAddonById = (id) => _ADDON_BY_ID[id] || null;
export const getEnvironmentSizeById = (id) => ENVIRONMENT_SIZES[id] || null;

// ── Component calculators ────────────────────────────────────────────────
// Each is pure: (formData) => { total: number, breakdown: Array<{...}> }.
// `total` feeds the running AppPoint sum; `breakdown` rows are appended
// verbatim to the itemized list.

function calculateBaseInstallAppPoints(formData) {
  const selected = formData.selectedApplications || [];
  let total = 0;
  const breakdown = [];

  for (const appId of selected) {
    const app = getApplicationById(appId);
    if (app && app.baseInstall > 0) {
      total += app.baseInstall;
      breakdown.push({ item: `${app.name} Base Install`, appPoints: app.baseInstall });
    }
  }

  return { total, breakdown };
}

function calculateUserAppPoints(formData) {
  const userMix = formData.userMix || {};
  let total = 0;
  const perTier = [];

  for (const tier of Object.keys(USER_TIER_APPPOINTS)) {
    const meta = USER_TIER_APPPOINTS[tier];
    const concurrent = userMix[tier]?.concurrent || 0;
    const authorized = userMix[tier]?.authorized || 0;
    const tierTotal = concurrent * meta.concurrent + authorized * meta.authorized;

    if (tierTotal > 0) {
      total += tierTotal;
      perTier.push({
        tier: meta.label,
        concurrent,
        authorized,
        appPointsPerConcurrent: meta.concurrent,
        appPointsPerAuthorized: meta.authorized,
        totalAppPoints: tierTotal,
      });
    }
  }

  // Wrapped summary row (nested under `details`), omitted entirely when no users.
  const breakdown =
    total > 0 ? [{ item: 'User AppPoints', appPoints: total, details: perTier }] : [];

  return { total, breakdown };
}

function calculateEnvironmentAppPoints(formData) {
  const environments = formData.environments;
  let total = 0;
  const breakdown = [];

  if (!environments) return { total, breakdown };

  // Production environment
  if (environments.prod?.size) {
    const sizeData = getEnvironmentSizeById(environments.prod.size);
    if (sizeData) {
      const count = environments.prod.count || 1;
      const appPoints = sizeData.appPoints * count;
      total += appPoints;
      breakdown.push({ item: `Production Environment (${sizeData.label})`, count, appPoints });
    }
  }

  // Non-production environments
  if (environments.nonProd) {
    for (const size of Object.keys(environments.nonProd)) {
      const count = environments.nonProd[size] || 0;
      if (count > 0) {
        const sizeData = getEnvironmentSizeById(size);
        if (sizeData) {
          const appPoints = sizeData.appPoints * count;
          total += appPoints;
          breakdown.push({ item: `Non-Prod Environment (${sizeData.label})`, count, appPoints });
        }
      }
    }
  }

  // Environments sized to match production
  if (environments.matchingProd > 0 && environments.prod?.size) {
    const sizeData = getEnvironmentSizeById(environments.prod.size);
    if (sizeData) {
      const appPoints = sizeData.appPoints * environments.matchingProd;
      total += appPoints;
      breakdown.push({
        item: `Non-Prod Matching Production (${sizeData.label})`,
        count: environments.matchingProd,
        appPoints,
      });
    }
  }

  return { total, breakdown };
}

function calculateAddonAppPoints(formData) {
  const selected = formData.selectedAddons;
  let total = 0;
  const breakdown = [];

  if (!selected || selected.length === 0) return { total, breakdown };

  for (const addonId of selected) {
    const addon = getAddonById(addonId);
    if (addon && addon.appPoints > 0) {
      total += addon.appPoints;
      breakdown.push({ item: addon.name, appPoints: addon.appPoints });
    }
  }

  return { total, breakdown };
}

function calculateAdvancedComponentAppPoints(formData) {
  const selected = formData.advancedComponents;
  let total = 0;
  const breakdown = [];

  if (!selected) return { total, breakdown };

  for (const componentId of Object.keys(selected)) {
    if (selected[componentId] === true) {
      const component = ADVANCED_COMPONENTS[componentId];
      if (component) {
        total += component.appPoints;
        breakdown.push({ item: component.name, appPoints: component.appPoints });
      }
    }
  }

  return { total, breakdown };
}

function calculateDatabaseAppPoints(formData) {
  const db = formData.database;
  let total = 0;
  const breakdown = [];

  if (!db) return { total, breakdown };

  // Database type (db2 is the default and carries no AppPoints)
  if (db.type && db.type !== 'db2') {
    const dbType = DATABASE_TYPES[db.type];
    if (dbType && dbType.appPoints > 0) {
      total += dbType.appPoints;
      breakdown.push({ item: `${dbType.name} Database`, appPoints: dbType.appPoints });
    }
  }

  // Database replicas
  if (db.replicas > 0) {
    const appPoints = db.replicas * DATABASE_REPLICA_APPPOINTS;
    total += appPoints;
    breakdown.push({ item: `Database Replicas (${db.replicas})`, appPoints });
  }

  return { total, breakdown };
}

function calculateDeploymentArchitectureAppPoints(formData) {
  const architecture = formData.deploymentArchitecture;
  if (!architecture || architecture === 'shared') return { total: 0, breakdown: [] };

  const arch = DEPLOYMENT_ARCHITECTURE[architecture];
  if (!arch || arch.appPoints === 0) return { total: 0, breakdown: [] };

  return {
    total: arch.appPoints,
    breakdown: [{ item: arch.name, appPoints: arch.appPoints }],
  };
}

// ── Registry (the "dynamic" seam) ────────────────────────────────────────
// Append a { key, run } entry to add a cost component. Order = breakdown order.
const COMPONENT_CALCULATORS = [
  { key: 'baseInstall',         run: calculateBaseInstallAppPoints },
  { key: 'userAppPoints',       run: calculateUserAppPoints },
  { key: 'environments',        run: calculateEnvironmentAppPoints },
  { key: 'addons',              run: calculateAddonAppPoints },
  { key: 'advancedComponents',  run: calculateAdvancedComponentAppPoints },
  { key: 'database',            run: calculateDatabaseAppPoints },
  { key: 'architecture',        run: calculateDeploymentArchitectureAppPoints },
];

function ensureMinimumAppPoints(formData, currentTotal) {
  const selected = formData.selectedApplications || [];
  let adjustment = 0;
  const breakdown = [];

  for (const appId of selected) {
    const app = getApplicationById(appId);
    if (app && app.minimumAppPoints) {
      const minimum = app.minimumAppPoints;
      if (currentTotal < minimum) {
        adjustment = Math.max(adjustment, minimum - currentTotal);
      }
    }
  }

  if (adjustment > 0) {
    breakdown.push({ item: 'Minimum AppPoints Adjustment', appPoints: adjustment });
  }

  return { adjustment, breakdown };
}

// ── Main calculation function ────────────────────────────────────────────

export function calculateEstimate(formData) {
  const breakdown = [];
  let totalAppPoints = 0;

  // 1–7. Run every registered component calculator.
  const componentResults = COMPONENT_CALCULATORS.map(({ key, run }) => ({
    key,
    ...run(formData),
  }));

  for (const { total, breakdown: rows } of componentResults) {
    totalAppPoints += total;
    breakdown.push(...rows);
  }

  // `userAppPoints` is read back here so the subtotal is exposed on the result
  // (used by the viz legend) — it is also included in `totalAppPoints` above.
  const userPointsSubtotal =
    componentResults.find((c) => c.key === 'userAppPoints')?.total ?? 0;

  // 8. Minimum AppPoints floor (depends on the running total).
  const minimums = ensureMinimumAppPoints(formData, totalAppPoints);
  totalAppPoints += minimums.adjustment;
  breakdown.push(...minimums.breakdown);

  // Pricing
  const basePointCost = PRICING.basePointCost;
  const listPrice = totalAppPoints * basePointCost;

  const contractTerm = formData.contractTerm || 1;
  const termDiscount = PRICING.contractTermDiscounts[contractTerm] || 0;
  const annualCost = listPrice * (1 - termDiscount);
  const monthlyCost = annualCost / 12;
  const totalCost = annualCost * contractTerm;

  // Total users across all tiers
  const totalUsers = Object.keys(USER_TIER_APPPOINTS).reduce((sum, tier) => {
    const concurrent = formData.userMix?.[tier]?.concurrent || 0;
    const authorized = formData.userMix?.[tier]?.authorized || 0;
    return sum + concurrent + authorized;
  }, 0);

  // User breakdown rows for display
  const userBreakdownRows = Object.keys(USER_TIER_APPPOINTS).map((tier) => {
    const meta = USER_TIER_APPPOINTS[tier];
    const concurrent = formData.userMix?.[tier]?.concurrent || 0;
    const authorized = formData.userMix?.[tier]?.authorized || 0;
    const points = concurrent * meta.concurrent + authorized * meta.authorized;

    return {
      id: tier,
      tier: `● ${meta.label}`,
      ptsPerUser: `${meta.concurrent} / ${meta.authorized}`,
      concurrent: String(concurrent),
      authorized: String(authorized),
      points: points.toLocaleString(),
    };
  });

  // Module configuration rows
  const moduleConfigRows = (formData.selectedApplications || []).map((appId) => {
    const app = getApplicationById(appId);
    return {
      id: appId,
      module: app ? app.name : appId,
      environments: '—',
      sizing: '—',
    };
  });

  // CPQ payload
  const cpqPayload = {
    opportunity: {
      name: formData.opportunityName || 'Maximo AppPoints Opportunity',
      company: formData.companyName || 'Customer Name',
      industry: formData.industry,
      notes: formData.dealNotes,
    },
    configuration: {
      deploymentModel: formData.deploymentModel,
      deploymentEdition: formData.deploymentEdition,
      deploymentArchitecture: formData.deploymentArchitecture,
      contractTerm: formData.contractTerm,
      applications: formData.selectedApplications,
      addons: formData.selectedAddons,
      industrySolution: formData.industrySolution,
      userMix: formData.userMix,
      licensingModel: formData.licensingModel,
      environments: formData.environments,
      database: formData.database,
      advancedComponents: formData.advancedComponents,
    },
    pricing: {
      totalAppPoints,
      breakdown,
      listPrice,
      termDiscount,
      annualCost,
      totalContractValue: totalCost,
    },
  };

  return {
    totalUsers,
    totalAppPoints,
    userPointsSubtotal,
    deploymentAdjustment: 0, // Deprecated
    termDiscount,
    listPrice,
    priceAfterDeployment: listPrice, // No deployment adjustment in new model
    annualCost,
    monthlyCost,
    totalCost,
    breakdown,
    moduleConfigRows,
    userBreakdownRows,
    cpqPayload,
  };
}

// ── Demo / runnable entry ────────────────────────────────────────────────

const isMain = process.argv[1] && process.argv[1].endsWith('pricing_engine.mjs');
if (isMain) {
  const sampleForm = {
    estimateName: 'Transport for London',
    companyName: 'Transport for London',
    industry: 'transportation',
    deploymentModel: 'saas',
    selectedApplications: ['manage', 'health', 'predict'],
    environmentSize: 'medium',
    environments: { prod: { size: 'medium', count: 1 } },
    userMix: {
      premium: { concurrent: 10, authorized: 5 },
      base: { concurrent: 40, authorized: 20 },
      limited: { concurrent: 60, authorized: 30 },
      selfService: { concurrent: 0, authorized: 0 },
    },
    licensingModel: 'concurrent',
    selectedAddons: ['transport-solution'],
    advancedComponents: { optimizer: true, scheduler: false, mobile: true, spatial: false },
    database: { type: 'oracle', replicas: 2 },
    deploymentArchitecture: 'dedicated',
    contractTerm: 3,
  };

  const result = calculateEstimate(sampleForm);
  const currency = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  console.log('Maximo AppPoints Pricing Engine — sample quote');
  console.log('------------------------------------------------');
  console.log('Customer:        ', sampleForm.companyName);
  console.log('Modules:         ', sampleForm.selectedApplications.join(', '));
  console.log('Total users:     ', result.totalUsers);
  console.log('Total AppPoints: ', result.totalAppPoints.toLocaleString());
  console.log('User subtotal:   ', result.userPointsSubtotal.toLocaleString());
  console.log('List price:      ', currency.format(result.listPrice));
  console.log('Term discount:   ', `${(result.termDiscount * 100).toFixed(0)}%`);
  console.log('Annual cost:     ', currency.format(result.annualCost));
  console.log('Monthly cost:    ', currency.format(result.monthlyCost));
  console.log('Total (3yr):     ', currency.format(result.totalCost));
  console.log('\nItemized breakdown:');
  for (const line of result.breakdown) {
    const pts = typeof line.appPoints === 'number' ? line.appPoints.toLocaleString() : '—';
    console.log(`  • ${line.item.padEnd(46)} ${String(pts).padStart(7)} pts`);
  }
}

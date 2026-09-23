/**
 * Maximo AppPoints pricing constants.
 *
 * NOTE: Exact IBM private pricing was not supplied with the design, so these
 * values are reasonable approximations calibrated to land near the figures in
 * the Figma mock (~380 AppPoints, ~$189,550/year). Tune here in one place.
 */

/* User tiers — AppPoints charged per user per licensing model. */
export const USER_TIER_APPPOINTS = {
  premium:     { label: 'Premium user',      concurrent: 25, authorized: 8 },
  base:        { label: 'Base user',         concurrent: 15, authorized: 5 },
  limited:     { label: 'Limited user',      concurrent: 8,  authorized: 3 },
  selfService: { label: 'Self-service user', concurrent: 4,  authorized: 1 },
};

/* Colors map to the visualization palette (see SummarySidebar). */
export const APPLICATIONS = [
  {
    id: 'manage',
    name: 'Managing assets, work orders, and maintenance',
    shortName: 'Manage',
    category: 'Comprehensive Asset Management',
    tags: ['Manage'],
    baseInstall: 200,
    minimumAppPoints: 0,
    color: 'purple',
  },
  {
    id: 'health',
    name: 'Asset health insights and scoring',
    shortName: 'Health',
    category: 'Asset Health Insights',
    tags: ['Manage', 'Health'],
    baseInstall: 100,
    minimumAppPoints: 0,
    color: 'blue',
  },
  {
    id: 'predict',
    name: 'Predict failures before they happen',
    shortName: 'Predict',
    category: 'Predictive Maintenance & AI',
    tags: ['Manage', 'Health', 'Predict'],
    baseInstall: 100,
    minimumAppPoints: 0,
    color: 'green',
  },
  {
    id: 'monitor',
    name: 'Real-time monitoring of connected devices',
    shortName: 'Monitor',
    category: 'IoT Device Monitoring',
    tags: ['Manage', 'Monitor'],
    baseInstall: 50,
    minimumAppPoints: 0,
    color: 'cyan',
  },
  {
    id: 'visualInspection',
    name: 'Automated visual inspection with AI',
    shortName: 'Visual Inspection',
    category: 'AI Visual Inspection',
    tags: ['Visual Inspection'],
    baseInstall: 50,
    minimumAppPoints: 0,
    color: 'teal',
  },
  {
    id: 'collaborate',
    name: 'Team collaboration and mobile workflow',
    shortName: 'Collaborate',
    category: 'Team Collaboration',
    tags: ['Collaborate'],
    baseInstall: 50,
    minimumAppPoints: 0,
    color: 'magenta',
  },
];

/* Optional add-ons (industry solutions, etc.). */
export const ADDONS = [
  { id: 'transport-solution', name: 'Transportation Industry Solution', appPoints: 25 },
  { id: 'aviation-solution', name: 'Aviation Industry Solution', appPoints: 25 },
  { id: 'utilities-solution', name: 'Energy & Utilities Industry Solution', appPoints: 25 },
];

/* Advanced components toggled on/off. */
export const ADVANCED_COMPONENTS = {
  optimizer: { name: 'Optimizer', appPoints: 20 },
  scheduler: { name: 'Scheduler', appPoints: 50 },
  mobile: { name: 'Mobile', appPoints: 0 },
  spatial: { name: 'Spatial', appPoints: 100 },
};

export const DATABASE_TYPES = {
  db2: { name: 'Db2', appPoints: 0 },
  oracle: { name: 'Oracle', appPoints: 40 },
  sqlserver: { name: 'SQL Server', appPoints: 30 },
};

export const DATABASE_REPLICA_APPPOINTS = 10;

export const DEPLOYMENT_ARCHITECTURE = {
  shared: { name: 'Shared infrastructure', appPoints: 0 },
  dedicated: { name: 'Dedicated infrastructure', appPoints: 60 },
};

/* Environment sizing tiers (map to Small/Medium/Large/Enterprise). */
export const ENVIRONMENT_SIZES = {
  small: { label: 'Small', appPoints: 0, description: 'Under 300 employees' },
  medium: { label: 'Medium', appPoints: 30, description: '300–3,000 employees' },
  large: { label: 'Large', appPoints: 75, description: '3,000–25,000 employees' },
  enterprise: { label: 'Enterprise', appPoints: 150, description: '25,000+ employees' },
};

export const PRICING = {
  basePointCost: 500, // $ per AppPoint / year
  contractTermDiscounts: {
    1: 0,
    3: 0.12,
    5: 0.2,
  },
};

/* ------------------------------------------------------------------ helpers */
export function getApplicationById(id) {
  return APPLICATIONS.find((app) => app.id === id) || null;
}

export function getAddonById(id) {
  return ADDONS.find((addon) => addon.id === id) || null;
}

export function getEnvironmentSizeById(id) {
  return ENVIRONMENT_SIZES[id] || null;
}

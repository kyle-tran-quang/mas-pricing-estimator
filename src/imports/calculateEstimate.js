import {
  USER_TIER_APPPOINTS,
  APPLICATIONS,
  ADVANCED_COMPONENTS,
  DATABASE_TYPES,
  DATABASE_REPLICA_APPPOINTS,
  DEPLOYMENT_ARCHITECTURE,
  PRICING,
  getApplicationById,
  getAddonById,
  getEnvironmentSizeById
} from './constants';

/**
 * Calculate user AppPoints — sums concurrent and authorized independently per tier.
 */
function calculateUserAppPoints(userMix) {
  let total = 0;
  const breakdown = [];

  Object.keys(USER_TIER_APPPOINTS).forEach(tier => {
    const tierData = USER_TIER_APPPOINTS[tier];
    const concurrent = userMix?.[tier]?.concurrent || 0;
    const authorized = userMix?.[tier]?.authorized || 0;
    const tierTotal = (concurrent * tierData.concurrent) + (authorized * tierData.authorized);

    if (tierTotal > 0) {
      total += tierTotal;
      breakdown.push({
        tier: tierData.label,
        concurrent,
        authorized,
        appPointsPerConcurrent: tierData.concurrent,
        appPointsPerAuthorized: tierData.authorized,
        totalAppPoints: tierTotal,
      });
    }
  });

  return { total, breakdown };
}

/**
 * Calculate base install AppPoints for selected applications
 */
function calculateBaseInstallAppPoints(selectedApplications) {
  let total = 0;
  const breakdown = [];

  selectedApplications.forEach(appId => {
    const app = getApplicationById(appId);
    if (app && app.baseInstall > 0) {
      total += app.baseInstall;
      breakdown.push({
        item: `${app.name} Base Install`,
        appPoints: app.baseInstall
      });
    }
  });

  return { total, breakdown };
}

/**
 * Calculate environment sizing AppPoints
 */
function calculateEnvironmentAppPoints(environments) {
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
      
      breakdown.push({
        item: `Production Environment (${sizeData.label})`,
        count,
        appPoints
      });
    }
  }

  // Non-production environments
  if (environments.nonProd) {
    Object.keys(environments.nonProd).forEach(size => {
      const count = environments.nonProd[size] || 0;
      if (count > 0) {
        const sizeData = getEnvironmentSizeById(size);
        if (sizeData) {
          const appPoints = sizeData.appPoints * count;
          total += appPoints;
          
          breakdown.push({
            item: `Non-Prod Environment (${sizeData.label})`,
            count,
            appPoints
          });
        }
      }
    });
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
        appPoints
      });
    }
  }

  return { total, breakdown };
}

/**
 * Calculate add-on AppPoints
 */
function calculateAddonAppPoints(selectedAddons) {
  let total = 0;
  const breakdown = [];

  if (!selectedAddons || selectedAddons.length === 0) {
    return { total, breakdown };
  }

  selectedAddons.forEach(addonId => {
    const addon = getAddonById(addonId);
    if (addon && addon.appPoints > 0) {
      total += addon.appPoints;
      breakdown.push({
        item: addon.name,
        appPoints: addon.appPoints
      });
    }
  });

  return { total, breakdown };
}

/**
 * Calculate advanced component AppPoints
 */
function calculateAdvancedComponentAppPoints(selectedComponents) {
  let total = 0;
  const breakdown = [];

  if (!selectedComponents) return { total, breakdown };

  Object.keys(selectedComponents).forEach(componentId => {
    if (selectedComponents[componentId] === true) {
      const component = ADVANCED_COMPONENTS[componentId];
      if (component) {
        total += component.appPoints;
        breakdown.push({
          item: component.name,
          appPoints: component.appPoints
        });
      }
    }
  });

  return { total, breakdown };
}

/**
 * Calculate database configuration AppPoints
 */
function calculateDatabaseAppPoints(databaseConfig) {
  let total = 0;
  const breakdown = [];

  if (!databaseConfig) return { total, breakdown };

  // Database type
  if (databaseConfig.type && databaseConfig.type !== 'db2') {
    const dbType = DATABASE_TYPES[databaseConfig.type];
    if (dbType && dbType.appPoints > 0) {
      total += dbType.appPoints;
      breakdown.push({
        item: `${dbType.name} Database`,
        appPoints: dbType.appPoints
      });
    }
  }

  // Database replicas
  if (databaseConfig.replicas > 0) {
    const appPoints = databaseConfig.replicas * DATABASE_REPLICA_APPPOINTS;
    total += appPoints;
    breakdown.push({
      item: `Database Replicas (${databaseConfig.replicas})`,
      appPoints
    });
  }

  return { total, breakdown };
}

/**
 * Calculate deployment architecture AppPoints
 */
function calculateDeploymentArchitectureAppPoints(architecture) {
  if (!architecture || architecture === 'shared') {
    return { total: 0, breakdown: [] };
  }

  const arch = DEPLOYMENT_ARCHITECTURE[architecture];
  if (!arch || arch.appPoints === 0) {
    return { total: 0, breakdown: [] };
  }

  return {
    total: arch.appPoints,
    breakdown: [{
      item: arch.name,
      appPoints: arch.appPoints
    }]
  };
}

/**
 * Ensure minimum AppPoints requirements are met
 */
function ensureMinimumAppPoints(selectedApplications, currentTotal) {
  let adjustment = 0;
  const breakdown = [];

  selectedApplications.forEach(appId => {
    const app = getApplicationById(appId);
    if (app && app.minimumAppPoints) {
      const minimum = app.minimumAppPoints;
      if (currentTotal < minimum) {
        const needed = minimum - currentTotal;
        adjustment = Math.max(adjustment, needed);
      }
    }
  });

  if (adjustment > 0) {
    breakdown.push({
      item: 'Minimum AppPoints Adjustment',
      appPoints: adjustment
    });
  }

  return { adjustment, breakdown };
}

/**
 * Main calculation function
 */
export function calculateEstimate(formData) {
  const breakdown = [];
  let totalAppPoints = 0;

  // 1. Base Install AppPoints
  const baseInstall = calculateBaseInstallAppPoints(formData.selectedApplications || []);
  totalAppPoints += baseInstall.total;
  breakdown.push(...baseInstall.breakdown);

  // 2. User AppPoints (concurrent + authorized summed per tier)
  const userAppPoints = calculateUserAppPoints(formData.userMix);
  totalAppPoints += userAppPoints.total;
  if (userAppPoints.total > 0) {
    breakdown.push({
      item: 'User AppPoints',
      appPoints: userAppPoints.total,
      details: userAppPoints.breakdown
    });
  }

  // 3. Environment Sizing AppPoints
  const environments = calculateEnvironmentAppPoints(formData.environments);
  totalAppPoints += environments.total;
  breakdown.push(...environments.breakdown);

  // 4. Add-on AppPoints
  const addons = calculateAddonAppPoints(formData.selectedAddons);
  totalAppPoints += addons.total;
  breakdown.push(...addons.breakdown);

  // 5. Advanced Components AppPoints
  const advancedComponents = calculateAdvancedComponentAppPoints(formData.advancedComponents);
  totalAppPoints += advancedComponents.total;
  breakdown.push(...advancedComponents.breakdown);

  // 6. Database Configuration AppPoints
  const database = calculateDatabaseAppPoints(formData.database);
  totalAppPoints += database.total;
  breakdown.push(...database.breakdown);

  // 7. Deployment Architecture AppPoints
  const architecture = calculateDeploymentArchitectureAppPoints(formData.deploymentArchitecture);
  totalAppPoints += architecture.total;
  breakdown.push(...architecture.breakdown);

  // 8. Ensure Minimum AppPoints
  const minimums = ensureMinimumAppPoints(formData.selectedApplications || [], totalAppPoints);
  totalAppPoints += minimums.adjustment;
  breakdown.push(...minimums.breakdown);

  // Calculate pricing
  const basePointCost = PRICING.basePointCost;
  const listPrice = totalAppPoints * basePointCost;
  
  // Apply contract term discount
  const contractTerm = formData.contractTerm || 1;
  const termDiscount = PRICING.contractTermDiscounts[contractTerm] || 0;
  const annualCost = listPrice * (1 - termDiscount);
  const monthlyCost = annualCost / 12;
  const totalCost = annualCost * contractTerm;

  // Calculate total users
  const totalUsers = Object.keys(USER_TIER_APPPOINTS).reduce((sum, tier) => {
    const concurrent = formData.userMix?.[tier]?.concurrent || 0;
    const authorized = formData.userMix?.[tier]?.authorized || 0;
    return sum + concurrent + authorized;
  }, 0);

  // User breakdown for display
  const userBreakdownRows = Object.keys(USER_TIER_APPPOINTS).map(tier => {
    const tierData = USER_TIER_APPPOINTS[tier];
    const concurrent = formData.userMix?.[tier]?.concurrent || 0;
    const authorized = formData.userMix?.[tier]?.authorized || 0;
    const points = (concurrent * tierData.concurrent) + (authorized * tierData.authorized);

    return {
      id: tier,
      tier: `● ${tierData.label}`,
      ptsPerUser: `${tierData.concurrent} / ${tierData.authorized}`,
      concurrent: String(concurrent),
      authorized: String(authorized),
      points: points.toLocaleString()
    };
  });

  // Module configuration rows (for backward compatibility)
  const moduleConfigRows = (formData.selectedApplications || []).map(appId => {
    const app = getApplicationById(appId);
    return {
      id: appId,
      module: app ? app.name : appId,
      environments: '—',
      sizing: '—'
    };
  });

  // CPQ payload
  const cpqPayload = {
    opportunity: {
      name: formData.opportunityName || 'Maximo AppPoints Opportunity',
      company: formData.companyName || 'Customer Name',
      industry: formData.industry,
      notes: formData.dealNotes
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
      advancedComponents: formData.advancedComponents
    },
    pricing: {
      totalAppPoints,
      breakdown,
      listPrice,
      termDiscount,
      annualCost,
      totalContractValue: totalCost
    }
  };

  return {
    totalUsers,
    totalAppPoints,
    userPointsSubtotal: userAppPoints.total,
    deploymentAdjustment: 0, // Deprecated
    termDiscount,
    listPrice,
    priceAfterDeployment: listPrice, // No deployment adjustment in new model
    annualCost,
    monthlyCost,
    totalCost,
    breakdown, // Detailed itemized breakdown
    moduleConfigRows,
    userBreakdownRows,
    cpqPayload
  };
}

// Made with Bob

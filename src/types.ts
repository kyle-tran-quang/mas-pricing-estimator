export type LicensingModel = 'concurrent' | 'authorized';

export type UserTierId = 'premium' | 'base' | 'limited' | 'selfService';

export interface TierCounts {
  concurrent: number;
  authorized: number;
}

export type UserMix = Record<UserTierId, TierCounts>;

export interface FormData {
  estimateName: string;
  companyName: string;
  industry: string;
  deploymentModel: 'saas' | 'onprem';
  selectedApplications: string[];
  environmentSize: string;
  environments: {
    prod: { size: string; count: number };
    nonProd?: Record<string, number>;
    matchingProd?: number;
  };
  userMix: UserMix;
  licensingModel: LicensingModel;
  selectedAddons: string[];
  advancedComponents: Record<string, boolean>;
  database: { type: string; replicas: number };
  deploymentArchitecture: string;
  contractTerm: 1 | 3 | 5;
}

/** Output shape of calculateEstimate (subset used by the UI). */
export interface EstimateResult {
  totalUsers: number;
  totalAppPoints: number;
  userPointsSubtotal: number;
  termDiscount: number;
  listPrice: number;
  annualCost: number;
  monthlyCost: number;
  totalCost: number;
  breakdown: Array<{ item: string; appPoints?: number; count?: number; details?: unknown }>;
  userBreakdownRows: Array<{
    id: string;
    tier: string;
    ptsPerUser: string;
    concurrent: string;
    authorized: string;
    points: string;
  }>;
  moduleConfigRows: Array<{ id: string; module: string }>;
  cpqPayload: unknown;
}

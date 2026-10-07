import type { FormData, EstimateResult } from './src/types';

export interface ApplicationInfo {
  id: string;
  name: string;
  shortName: string;
  category: string;
  tags: string[];
  baseInstall: number;
  minimumAppPoints: number;
  color: string;
}

export interface AddonInfo {
  id: string;
  name: string;
  appPoints: number;
}

export interface UserTierMeta {
  label: string;
  concurrent: number;
  authorized: number;
}

export interface EnvironmentSizeInfo {
  label: string;
  appPoints: number;
  description: string;
}

export const USER_TIER_APPPOINTS: Record<string, UserTierMeta>;
export const APPLICATIONS: ApplicationInfo[];
export const ADDONS: AddonInfo[];
export const ADVANCED_COMPONENTS: Record<string, { name: string; appPoints: number } | undefined>;
export const DATABASE_TYPES: Record<string, { name: string; appPoints: number } | undefined>;
export const DATABASE_REPLICA_APPPOINTS: number;
export const DEPLOYMENT_ARCHITECTURE: Record<string, { name: string; appPoints: number } | undefined>;
export const ENVIRONMENT_SIZES: Record<string, EnvironmentSizeInfo | undefined>;
export const PRICING: {
  basePointCost: number;
  contractTermDiscounts: Record<number, number>;
};

export function getApplicationById(id: string): ApplicationInfo | null;
export function getAddonById(id: string): AddonInfo | null;
export function getEnvironmentSizeById(id: string): EnvironmentSizeInfo | null;

export function calculateEstimate(formData: FormData): EstimateResult;

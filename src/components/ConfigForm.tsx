import { forwardRef, useState } from 'react';
import { SelectableTile, NumberInput, Tag, RadioTile, Checkbox } from '@carbon/react';
import InlineEditableName from './InlineEditableName';
import {
  Plane,
  NavaidNdb,
  Lightning,
  GasStation,
  Bus,
  Industry as IndustryIcon,
  Sprout,
  Building,
  Chemistry,
  Layers,
  ChevronDown,
  ChevronUp,
} from '@carbon/icons-react';
import { APPLICATIONS, USER_TIER_APPPOINTS, ENVIRONMENT_SIZES } from '../imports/constants';
import type { FormData, UserTierId, TierCounts } from '../types';

/* ── Step 1 More Options data ───────────────────────────────────────── */

const INDUSTRIES = [
  { id: 'aviation',       label: 'Aviation',             Icon: Plane },
  { id: 'nuclear',        label: 'Nuclear',              Icon: NavaidNdb },
  { id: 'energy',         label: 'Energy & Utilities',   Icon: Lightning },
  { id: 'oilgas',         label: 'Oil & Gas',            Icon: GasStation },
  { id: 'transportation', label: 'Transportation',       Icon: Bus },
  { id: 'civil',          label: 'Civil Infrastructure', Icon: Building },
  { id: 'manufacturing',  label: 'Manufacturing',        Icon: IndustryIcon },
  { id: 'lifesciences',   label: 'Life Sciences',        Icon: Chemistry },
  { id: 'government',     label: 'Government / Defense', Icon: Sprout },
  { id: 'other',          label: 'Other',                Icon: Layers },
];

const INDUSTRY_SOLUTIONS = [
  { id: 'sol-aviation',       label: 'Aviation Solution',             description: 'Aviation-specific workflows and features' },
  { id: 'sol-nuclear',        label: 'Nuclear Solution',              description: 'Nuclear power plant management' },
  { id: 'sol-utilities',      label: 'Utilities Solution',            description: 'Utility asset management' },
  { id: 'sol-oilgas',         label: 'Oil and Gas Solution',          description: 'Oil and gas industry workflows' },
  { id: 'sol-transportation', label: 'Transportation Solution',       description: 'Transportation asset management' },
  { id: 'sol-civil',          label: 'Civil Infrastructure Solution', description: 'Infrastructure asset management' },
];

const ESSENTIALS_PACKAGES = [
  { id: 'pkg-maintenance', label: 'Maintenance Essentials',            description: 'Pre-configured for maintenance management' },
  { id: 'pkg-inspection',  label: 'Inspection Essentials',            description: 'Pre-configured for visual inspections' },
  { id: 'pkg-capital',     label: 'Capital projects essentials',      description: 'Pre-configured for capital projects' },
  { id: 'pkg-space',       label: 'Space Management Essentials',      description: 'Pre-configured for space management' },
  { id: 'pkg-lease',       label: 'Lease Management Essentials',      description: 'Preconfigured for lease management' },
  { id: 'pkg-inventory',   label: 'Inventory Optimization Essentials', description: 'Pre-configured for inventory optimization' },
];

/* ── Step 3 More Options data ───────────────────────────────────────── */

// IDs must match APPLICATIONS constant IDs where they overlap with the main grid
const CORE_APPLICATIONS = [
  { id: 'manage',           label: 'Maximo Manage',            description: 'Enterprise Asset Management',          appPoints: 100 },
  { id: 'health',           label: 'Maximo Health',            description: 'Asset Health Insights',               appPoints: 100 },
  { id: 'predict',          label: 'Maximo Predict',           description: 'Predictive Maintenance',              appPoints: 100 },
  { id: 'monitor',          label: 'Maximo Monitor',           description: 'IoT Device Monitoring',               appPoints: 100 },
  { id: 'visualInspection', label: 'Maximo Visual Inspection', description: 'AI-Powered Visual Inspection',        appPoints: 100 },
  { id: 'collaborate',      label: 'Maximo Collaborate',       description: 'Team Collaboration (formerly Assist)', appPoints: 100 },
];

const INDUSTRY_APPLICATIONS = [
  { id: 'iapp-it',          label: 'Maximo IT',                       description: 'IT Asset Management',              appPoints: 100 },
  { id: 'iapp-realestate',  label: 'Maximo Real Estate & Facilities', description: 'Real Estate & Facilities Management', appPoints: 300 },
];

const SPECIALIZED_APPLICATIONS = [
  { id: 'sapp-invopt',  label: 'Maximo Inventory Optimization', description: 'MRO Inventory Optimization' },
  { id: 'sapp-outage',  label: 'Maximo Outage Prediction',      description: 'Utility Outage Prediction' },
  { id: 'sapp-veg',     label: 'Maximo Vegetation Management',  description: 'Vegetation Management for Utilities' },
  { id: 'sapp-ai',      label: 'Maximo AI Service',             description: 'AI-Powered Insights' },
  { id: 'sapp-envizi',  label: 'Maximo Envizi ESG Suite',       description: 'Environmental, Social & Governance' },
];

const MANAGE_ADDONS = [
  { id: 'addon-acm',   label: 'Asset Configuration Manager',      description: 'Comprehensive Asset Management',             appPoints: 100, badgeType: 'Addon' as const },
  { id: 'addon-aip',   label: 'Asset Investment Planning',        description: 'Capital investment planning and optimization', appPoints: 100, badgeType: 'Addon' as const },
  { id: 'addon-sp',    label: 'Service Provider',                 description: 'Multi-tenant service provider capabilities',   appPoints: 100, badgeType: 'Addon' as const },
  { id: 'addon-hse',   label: 'Health, Safety & Environment',     description: 'HSE management and compliance',               appPoints: 100, badgeType: 'Addon' as const },
  { id: 'addon-spa',   label: 'Spatial',                          description: 'GIS and spatial asset management',             appPoints: 100, badgeType: 'Addon' as const },
  { id: 'addon-optl',  label: 'Optimizer Limited',                description: 'Schedule optimization (1 model)',              appPoints: 100, badgeType: 'Addon' as const },
  { id: 'addon-optf',  label: 'Optimizer Full',                   description: 'Schedule optimization (unlimited models)',     appPoints: 100, badgeType: 'Addon' as const },
  { id: 'addon-mob',   label: 'Mobile',                           description: 'Mobile workforce management',                  appPoints: 100, badgeType: 'Addon' as const },
  { id: 'conn-oracle', label: 'Connector for Oracle Applications', description: 'Integration with Oracle ERP',                appPoints: 100, badgeType: 'Connector' as const },
  { id: 'conn-sap',    label: 'Connector for SAP Applications',   description: 'Integration with SAP ERP',                    appPoints: 100, badgeType: 'Connector' as const },
];

const ADVANCED_COMPONENTS = [
  { id: 'adv-edr',  label: 'Event Data Repository', description: 'High-volume IoT data storage (for Monitor/Predict)', appPoints: 900 },
  { id: 'adv-java', label: 'Java Extension',         description: 'Custom Java code extensions',                       appPoints: 300 },
];

/* ── Deployment / contract ──────────────────────────────────────────── */

const DEPLOYMENT_OPTIONS = [
  { id: 'saas',   label: 'IBM Maximo Application Suite SaaS', sublabel: 'IBM hosts and manages the IT infrastructure in the cloud.' },
  { id: 'onprem', label: 'On-Premises',                        sublabel: 'Customer hosts and manages in their own data center.' },
];

const CONTRACT_TERMS = [
  { value: 1, label: '1 Year',  sublabel: 'Standard term. No multi-year discount.' },
  { value: 3, label: '3 Years', sublabel: '12% multi-year discount applied.' },
  { value: 5, label: '5 Years', sublabel: 'Best price — 20% discount.' },
];

const USER_TIERS: UserTierId[] = ['premium', 'base', 'limited', 'selfService'];

/* ── Props ──────────────────────────────────────────────────────────── */

interface Props {
  formData: FormData;
  perTierPoints: Record<UserTierId, number>;
  totalUsers: number;
  onChange: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
  onToggleApplication: (id: string) => void;
  onUserMixChange: (tier: UserTierId, field: keyof TierCounts, value: number) => void;
  registerSection: (index: number) => (el: HTMLElement | null) => void;
}

/* ── Section wrapper ────────────────────────────────────────────────── */

const Section = forwardRef<HTMLElement, { eyebrow: string; title: string; children: React.ReactNode }>(
  function Section({ eyebrow, title, children }, ref) {
    return (
      <section className="step" ref={ref}>
        <header className="step__header">
          <p className="step__eyebrow">{eyebrow}</p>
          <h3 className="step__title">{title}</h3>
        </header>
        {children}
      </section>
    );
  },
);

/* ── Shared ChecklistItem ───────────────────────────────────────────── */

interface ChecklistItemProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  appPoints?: number;
  badgeType?: 'Addon' | 'Connector';
}

function ChecklistItem({ id, label, description, checked, onChange, appPoints, badgeType }: ChecklistItemProps) {
  return (
    <div className={`checklist-item${checked ? ' checklist-item--selected' : ''}`}>
      <div className="checklist-item__check">
        <Checkbox
          id={id}
          labelText=""
          hideLabel
          checked={checked}
          onChange={(_e, { checked: c }) => onChange(c)}
        />
      </div>
      <div className="checklist-item__body">
        <p className="checklist-item__label">{label}</p>
        <p className="checklist-item__desc">{description}</p>
        {badgeType && (
          <span className="checklist-item__badge">{badgeType}</span>
        )}
      </div>
      {appPoints !== undefined && (
        <span className="checklist-item__ap">{appPoints} AppPoints</span>
      )}
    </div>
  );
}

/* ── Subsection header ──────────────────────────────────────────────── */

function SubsectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="more-options-section__header">
      <p className="more-options-section__title">{title}</p>
      <p className="more-options-section__desc">{description}</p>
    </div>
  );
}

/* ── ConfigForm ─────────────────────────────────────────────────────── */

export default function ConfigForm({
  formData,
  perTierPoints,
  totalUsers,
  onChange,
  onToggleApplication,
  onUserMixChange,
  registerSection,
}: Props) {
  // Step 1 more-options state
  const [step1Open, setStep1Open] = useState(false);
  const [selectedSolutions, setSelectedSolutions] = useState<string[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);

  // Step 3 more-options state (Industry, Specialized, Addons, Advanced — Core uses formData)
  const [step3Open, setStep3Open] = useState(false);
  const [selectedIndustryApps, setSelectedIndustryApps] = useState<string[]>([]);
  const [selectedSpecializedApps, setSelectedSpecializedApps] = useState<string[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [selectedAdvanced, setSelectedAdvanced] = useState<string[]>([]);

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (id: string) =>
    setter((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  // Compute total AppPoints from core selections for the accordion tag
  const coreAP = CORE_APPLICATIONS
    .filter((a) => formData.selectedApplications.includes(a.id))
    .reduce((sum, a) => sum + a.appPoints, 0);
  const industryAP = INDUSTRY_APPLICATIONS
    .filter((a) => selectedIndustryApps.includes(a.id))
    .reduce((sum, a) => sum + a.appPoints, 0);
  const addonAP = MANAGE_ADDONS
    .filter((a) => selectedAddons.includes(a.id))
    .reduce((sum, a) => sum + a.appPoints, 0);
  const advancedAP = ADVANCED_COMPONENTS
    .filter((a) => selectedAdvanced.includes(a.id))
    .reduce((sum, a) => sum + a.appPoints, 0);
  const totalModuleAP = coreAP + industryAP + addonAP + advancedAP;

  // User pool KPI totals (concurrent, authorized, and total user AppPoints).
  const concurrentUsers = USER_TIERS.reduce((sum, t) => sum + formData.userMix[t].concurrent, 0);
  const authorizedUsers = USER_TIERS.reduce((sum, t) => sum + formData.userMix[t].authorized, 0);
  const totalUserPoints = USER_TIERS.reduce((sum, t) => sum + perTierPoints[t], 0);

  return (
    <div className="estimator__form" id="main-content">
      <div className="estimator__form-name">
        <InlineEditableName
          label="Estimate name"
          value={formData.estimateName}
          placeholder="Untitled estimate"
          onSave={(n) => onChange('estimateName', n)}
        />
      </div>

      {/* ── Step 1: Industry ── */}
      <Section ref={registerSection(0)} eyebrow="Step 1" title="What industry is the customer in?">
        <div className="tile-group-grid-3" role="radiogroup" aria-label="Industry">
          {INDUSTRIES.map(({ id, label, Icon }) => (
            <RadioTile
              key={id}
              id={`industry-${id}`}
              name="industry"
              value={id}
              checked={formData.industry === id}
              onChange={() => onChange('industry', id)}
            >
              <span className="radio-tile__label">
                <Icon size={16} />
                {label}
              </span>
            </RadioTile>
          ))}
        </div>

        <div className="more-options-panel">
          <button
            type="button"
            className="more-options-panel__header"
            aria-expanded={step1Open}
            onClick={() => setStep1Open((o) => !o)}
          >
            <span className="more-options-panel__title">More Options</span>
            {step1Open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {step1Open && (
            <div className="more-options-panel__body">
              <div className="more-options-section">
                <SubsectionHeader
                  title="Industry Solutions (Optional)"
                  description="Add specialized workflows and features for specific industries. Multiple solutions can be selected as advisory solution context."
                />
                <div className="checklist-grid-4">
                  {INDUSTRY_SOLUTIONS.map((sol) => (
                    <ChecklistItem
                      key={sol.id}
                      id={sol.id}
                      label={sol.label}
                      description={sol.description}
                      checked={selectedSolutions.includes(sol.id)}
                      onChange={() => toggle(setSelectedSolutions)(sol.id)}
                    />
                  ))}
                </div>
              </div>

              <div className="more-options-section">
                <SubsectionHeader
                  title="Essentials Edition Packages (Optional)"
                  description="Pre-configured packages for specific use cases. Select multiple if needed, or skip to configure manually."
                />
                <div className="checklist-grid-4">
                  {ESSENTIALS_PACKAGES.map((pkg) => (
                    <ChecklistItem
                      key={pkg.id}
                      id={pkg.id}
                      label={pkg.label}
                      description={pkg.description}
                      checked={selectedPackages.includes(pkg.id)}
                      onChange={() => toggle(setSelectedPackages)(pkg.id)}
                      appPoints={50}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* ── Step 2: Deployment ── */}
      <Section
        ref={registerSection(1)}
        eyebrow="Step 2"
        title="Configure your customer's SaaS environment"
      >
        <div className="tile-group-stack" role="radiogroup" aria-label="Deployment model">
          {DEPLOYMENT_OPTIONS.map(({ id, label, sublabel }) => (
            <RadioTile
              key={id}
              id={`dep-${id}`}
              name="deploymentModel"
              value={id}
              checked={formData.deploymentModel === id}
              onChange={() => onChange('deploymentModel', id as FormData['deploymentModel'])}
            >
              <strong style={{ display: 'block', fontSize: 14, lineHeight: '18px' }}>{label}</strong>
              <p style={{ fontSize: 12, color: 'var(--cds-text-secondary)', marginTop: 4, fontWeight: 400 }}>{sublabel}</p>
            </RadioTile>
          ))}
        </div>
      </Section>

      {/* ── Step 3: Applications ── */}
      <Section ref={registerSection(2)} eyebrow="Step 3" title="What is the problem that the customer need to solve?">
        <div className="app-tile-grid">
          {APPLICATIONS.map((app) => (
            <SelectableTile
              key={app.id}
              id={`app-${app.id}`}
              selected={formData.selectedApplications.includes(app.id)}
              onClick={() => onToggleApplication(app.id)}
            >
              <strong style={{ fontSize: 14, lineHeight: '18px', letterSpacing: '0.16px' }}>
                {app.name}
              </strong>
              <p className="app-tile__category" style={{ marginTop: 4, marginBottom: 8 }}>
                {app.category}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {app.tags.map((tag) => (
                  <Tag key={tag} type="gray" size="sm">
                    {tag}
                  </Tag>
                ))}
              </div>
            </SelectableTile>
          ))}
        </div>

        {/* Step 3 More Options accordion */}
        <div className="more-options-panel">
          <button
            type="button"
            className="more-options-panel__header"
            aria-expanded={step3Open}
            onClick={() => setStep3Open((o) => !o)}
          >
            <span className="more-options-panel__title">More Options</span>
            {totalModuleAP > 0 && (
              <span className="more-options-panel__ap-tag">{totalModuleAP} AppPoints from modules</span>
            )}
            {step3Open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {step3Open && (
            <div className="more-options-panel__body">
              {/* Core Applications */}
              <div className="more-options-section">
                <SubsectionHeader
                  title="Core Applications"
                  description="Enterprise asset management and monitoring applications"
                />
                <div className="checklist-grid-4">
                  {CORE_APPLICATIONS.map((app) => (
                    <ChecklistItem
                      key={app.id}
                      id={`core-${app.id}`}
                      label={app.label}
                      description={app.description}
                      checked={formData.selectedApplications.includes(app.id)}
                      onChange={() => onToggleApplication(app.id)}
                      appPoints={app.appPoints}
                    />
                  ))}
                </div>
              </div>

              {/* Industry Applications */}
              <div className="more-options-section">
                <SubsectionHeader
                  title="Industry Applications"
                  description="Specialized applications for specific industries"
                />
                <div className="checklist-grid-4">
                  {INDUSTRY_APPLICATIONS.map((app) => (
                    <ChecklistItem
                      key={app.id}
                      id={app.id}
                      label={app.label}
                      description={app.description}
                      checked={selectedIndustryApps.includes(app.id)}
                      onChange={() => toggle(setSelectedIndustryApps)(app.id)}
                      appPoints={app.appPoints}
                    />
                  ))}
                </div>
              </div>

              {/* Specialized Applications */}
              <div className="more-options-section">
                <SubsectionHeader
                  title="Specialized Applications"
                  description="Additional capabilities for specific use cases"
                />
                <div className="checklist-grid-4">
                  {SPECIALIZED_APPLICATIONS.map((app) => (
                    <ChecklistItem
                      key={app.id}
                      id={app.id}
                      label={app.label}
                      description={app.description}
                      checked={selectedSpecializedApps.includes(app.id)}
                      onChange={() => toggle(setSelectedSpecializedApps)(app.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Manage Add-ons */}
              <div className="more-options-section">
                <SubsectionHeader
                  title="Manage Add-ons"
                  description="Extended capabilities for Maximo Manage"
                />
                <div className="checklist-grid-4">
                  {MANAGE_ADDONS.map((addon) => (
                    <ChecklistItem
                      key={addon.id}
                      id={addon.id}
                      label={addon.label}
                      description={addon.description}
                      checked={selectedAddons.includes(addon.id)}
                      onChange={() => toggle(setSelectedAddons)(addon.id)}
                      appPoints={addon.appPoints}
                      badgeType={addon.badgeType}
                    />
                  ))}
                </div>
              </div>

              {/* Advanced Components */}
              <div className="more-options-section">
                <SubsectionHeader
                  title="Advanced Components"
                  description="Technical components for advanced requirements"
                />
                <div className="checklist-grid-4">
                  {ADVANCED_COMPONENTS.map((comp) => (
                    <ChecklistItem
                      key={comp.id}
                      id={comp.id}
                      label={comp.label}
                      description={comp.description}
                      checked={selectedAdvanced.includes(comp.id)}
                      onChange={() => toggle(setSelectedAdvanced)(comp.id)}
                      appPoints={comp.appPoints}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* ── Step 4: Environment + users ── */}
      <Section ref={registerSection(3)} eyebrow="Step 4" title="Size the environment and user pool">
        <div className="tile-group-grid-3" role="radiogroup" aria-label="Environment size">
          {(Object.entries(ENVIRONMENT_SIZES) as [string, { label: string; description: string; appPoints: number }][]).map(([id, size]) => (
            <RadioTile
              key={id}
              id={`env-${id}`}
              name="environmentSize"
              value={id}
              checked={formData.environmentSize === id}
              onChange={() => onChange('environmentSize', id)}
            >
              <strong style={{ display: 'block', fontSize: 14, lineHeight: '18px' }}>{size.label}</strong>
              <p style={{ fontSize: 12, color: 'var(--cds-text-secondary)', marginTop: 4, fontWeight: 400 }}>{size.description}</p>
            </RadioTile>
          ))}
        </div>

        <div>
          <p className="subsection-title" style={{ padding: '24px 0 16px' }}>User pool</p>
          <div className="userpool__summary" style={{ padding: '0 0 24px' }}>
            <div className="userpool__summary-item">
              <div className="userpool__summary-value">
                <span className="value">{concurrentUsers.toLocaleString('en-US')}</span>
              </div>
              <span className="label">Concurrent users</span>
            </div>
            <div className="userpool__summary-item">
              <div className="userpool__summary-value">
                <span className="value">{authorizedUsers.toLocaleString('en-US')}</span>
              </div>
              <span className="label">Authorized users</span>
            </div>
            <div className="userpool__summary-item">
              <div className="userpool__summary-value">
                <span className="value">{totalUserPoints.toLocaleString('en-US')}</span>
                <span className="unit">AppPoints</span>
              </div>
              <span className="label">Total user AppPoints</span>
            </div>
          </div>

          <div className="userpool__rows">
            {USER_TIERS.map((tier) => {
              const meta = USER_TIER_APPPOINTS[tier];
              const counts = formData.userMix[tier];
              return (
                <div key={tier} className="userpool__row">
                  <div className="userpool__info">
                    <span className="userpool__info-name">{meta.label}</span>
                    <span className="userpool__info-meta">
                      <span>{meta.concurrent} pts/concurrent</span>
                      <span>{meta.authorized} pts/authorized</span>
                    </span>
                  </div>
                  <div className="userpool__inputs">
                    <NumberInput
                      id={`${tier}-concurrent`}
                      label="Concurrent"
                      min={0}
                      value={counts.concurrent}
                      onChange={(_e: unknown, { value }: { value: string | number }) =>
                        onUserMixChange(tier, 'concurrent', Number(value) || 0)
                      }
                    />
                    <NumberInput
                      id={`${tier}-authorized`}
                      label="Authorized"
                      min={0}
                      value={counts.authorized}
                      onChange={(_e: unknown, { value }: { value: string | number }) =>
                        onUserMixChange(tier, 'authorized', Number(value) || 0)
                      }
                    />
                  </div>
                  <div className="userpool__points">
                    <Tag type="blue" size="md">
                      {perTierPoints[tier].toLocaleString('en-US')} AP
                    </Tag>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ── Step 5: Contract term ── */}
      <Section ref={registerSection(4)} eyebrow="Step 5" title="Select a contract term">
        <div className="tile-group-grid-3" role="radiogroup" aria-label="Contract term">
          {CONTRACT_TERMS.map(({ value, label, sublabel }) => (
            <RadioTile
              key={value}
              id={`term-${value}`}
              name="contractTerm"
              value={String(value)}
              checked={formData.contractTerm === value}
              onChange={() => onChange('contractTerm', value as FormData['contractTerm'])}
            >
              <strong style={{ display: 'block', fontSize: 14, lineHeight: '18px' }}>{label}</strong>
              <p style={{ fontSize: 12, color: 'var(--cds-text-secondary)', marginTop: 4, fontWeight: 400 }}>{sublabel}</p>
            </RadioTile>
          ))}
        </div>
      </Section>
    </div>
  );
}

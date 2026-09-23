import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Theme } from '@carbon/react';
import AppShell from './components/AppShell';
import ChatPanel from './components/ChatPanel';
import SummarySidebar, { type VizSegment } from './components/SummarySidebar';
import StepNav, { type NavStep } from './components/StepNav';
import ConfigForm from './components/ConfigForm';
import ReviewPage from './components/ReviewPage';
import { calculateEstimate } from './imports/calculateEstimate';
import {
  APPLICATIONS,
  USER_TIER_APPPOINTS,
  ENVIRONMENT_SIZES,
  DEPLOYMENT_ARCHITECTURE,
  PRICING,
} from './imports/constants';
import type { FormData, UserTierId, TierCounts } from './types';

const NAV_STEPS: NavStep[] = [
  { id: 'industry', label: 'Industry' },
  { id: 'environment', label: 'Environment' },
  { id: 'solutions', label: 'Solutions' },
  { id: 'users', label: 'Users mix' },
  { id: 'contract', label: 'Contract' },
];

const TIER_COLORS: Record<UserTierId, string> = {
  premium: '#4589ff',
  base: '#ff8389',
  limited: '#82cfff',
  selfService: '#42be65',
};

const INITIAL_FORM: FormData = {
  estimateName: 'Transport for London',
  companyName: 'Transport for London',
  industry: 'transportation',
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

export default function App() {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [currentStep, setCurrentStep] = useState(0);
  const [view, setView] = useState<'form' | 'review'>('form');
  const [chatOpen, setChatOpen] = useState(false);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  const result = useMemo(() => calculateEstimate(formData), [formData]);

  const handleChange = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const toggleApplication = (id: string) => {
    setFormData((prev) => {
      const has = prev.selectedApplications.includes(id);
      return {
        ...prev,
        selectedApplications: has
          ? prev.selectedApplications.filter((a) => a !== id)
          : [...prev.selectedApplications, id],
      };
    });
  };

  const handleUserMixChange = (tier: UserTierId, field: keyof TierCounts, value: number) => {
    setFormData((prev) => ({
      ...prev,
      userMix: { ...prev.userMix, [tier]: { ...prev.userMix[tier], [field]: Math.max(0, value) } },
    }));
  };

  const handleEnvSize = (size: string) => {
    setFormData((prev) => ({
      ...prev,
      environmentSize: size,
      environments: { ...prev.environments, prod: { ...prev.environments.prod, size } },
    }));
  };

  const perTierPoints = useMemo(() => {
    const out = {} as Record<UserTierId, number>;
    (Object.keys(USER_TIER_APPPOINTS) as UserTierId[]).forEach((tier) => {
      const meta = USER_TIER_APPPOINTS[tier];
      const counts = formData.userMix[tier];
      out[tier] = counts.concurrent * meta.concurrent + counts.authorized * meta.authorized;
    });
    return out;
  }, [formData.userMix]);

  const totalUsers = useMemo(
    () =>
      (Object.keys(formData.userMix) as UserTierId[]).reduce(
        (sum, tier) => sum + formData.userMix[tier].concurrent + formData.userMix[tier].authorized,
        0,
      ),
    [formData.userMix],
  );

  const segments = useMemo<VizSegment[]>(() => {
    const cost = (points: number) => points * PRICING.basePointCost;
    const list: Omit<VizSegment, 'colorIndex'>[] = [];

    // Each application contributes its own base-install AppPoints below, matching
    // the pricing engine — no extra flat "install" term (it would over-count the
    // chart relative to the AppPoints total the engine reports).
    APPLICATIONS.filter((app) => formData.selectedApplications.includes(app.id)).forEach((app) => {
      list.push({
        id: app.id,
        name: app.shortName,
        appPoints: app.baseInstall,
        price: cost(app.baseInstall),
      });
    });

    const envPoints = ENVIRONMENT_SIZES[formData.environmentSize]?.appPoints ?? 0;
    if (envPoints > 0) {
      list.push({
        id: 'env',
        name: `${ENVIRONMENT_SIZES[formData.environmentSize].label} environment`,
        appPoints: envPoints,
        price: cost(envPoints),
      });
    }

    const archPoints = DEPLOYMENT_ARCHITECTURE[formData.deploymentArchitecture]?.appPoints ?? 0;
    if (archPoints > 0) {
      list.push({
        id: 'arch',
        name: 'Dedicated infrastructure',
        appPoints: archPoints,
        price: cost(archPoints),
      });
    }

    if (result.userPointsSubtotal > 0) {
      list.push({
        id: 'users',
        name: 'User AppPoints',
        appPoints: result.userPointsSubtotal,
        price: cost(result.userPointsSubtotal),
      });
    }

    // Sequential palette — each visible segment gets the next distinct color.
    return list.map((seg, colorIndex) => ({ ...seg, colorIndex }));
  }, [
    formData.selectedApplications,
    formData.environmentSize,
    formData.deploymentArchitecture,
    result.userPointsSubtotal,
  ]);

  const legend = useMemo(
    () =>
      (Object.keys(USER_TIER_APPPOINTS) as UserTierId[]).map((tier) => ({
        id: tier,
        name: USER_TIER_APPPOINTS[tier].label.replace(' user', ''),
        points: perTierPoints[tier],
        color: TIER_COLORS[tier],
      })),
    [perTierPoints],
  );

  const registerSection = (index: number) => (el: HTMLElement | null) => {
    sectionRefs.current[index] = el;
  };

  // While a tab-click smooth-scroll is in flight, ignore scroll-spy so the
  // active tab doesn't flicker through intermediate sections.
  const suppressSpyUntil = useRef(0);

  const goToStep = (index: number) => {
    suppressSpyUntil.current = Date.now() + 800;
    setCurrentStep(index);
    sectionRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Scroll-spy: highlight the step whose section is currently near the top.
  useEffect(() => {
    if (view !== 'form') return;
    const sections = sectionRefs.current;
    // Track every section's visibility (not just the entries that changed this
    // tick) so the topmost in-band section is always chosen reliably.
    const visible = new Array<boolean>(sections.length).fill(false);

    const pickActive = () => {
      if (Date.now() < suppressSpyUntil.current) return;
      // If the page is scrolled to the very bottom, the last (often short)
      // section can never reach the detection band — force-select it.
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom) {
        setCurrentStep(sections.length - 1);
        return;
      }
      // Otherwise pick the topmost section currently within the band.
      const index = visible.findIndex(Boolean);
      if (index !== -1) setCurrentStep(index);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const i = sections.indexOf(e.target as HTMLElement);
          if (i !== -1) visible[i] = e.isIntersecting;
        });
        pickActive();
      },
      // Active band sits just below the sticky header, ~top 40% of viewport.
      { rootMargin: '-48px 0px -60% 0px', threshold: 0 },
    );

    sections.forEach((el) => el && observer.observe(el));
    // Re-evaluate on scroll too, so bottom-of-page detection stays live.
    window.addEventListener('scroll', pickActive, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', pickActive);
    };
  }, [view]);

  return (
    <Theme theme="g10">
    <div className="estimator">
      <div className="estimator__header">
        <AppShell onAiLaunch={() => setChatOpen((v) => !v)} />
      </div>

      <ChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        onApplyConfig={(fd) => {
          setFormData(fd);
          setView('form');
          setCurrentStep(0);
          setChatOpen(false);
        }}
      />
      {chatOpen && <button type="button" className="chatp__scrim" aria-label="Close assistant" onClick={() => setChatOpen(false)} />}

      {view === 'form' ? (
        <>
          <div className="estimator__body">
            <main className="estimator__main">
              <StepNav steps={NAV_STEPS} current={currentStep} onSelect={goToStep} />
              <ConfigForm
                formData={formData}
                perTierPoints={perTierPoints}
                totalUsers={totalUsers}
                onChange={(key, value) => {
                  if (key === 'environmentSize') handleEnvSize(String(value));
                  else handleChange(key, value);
                }}
                onToggleApplication={toggleApplication}
                onUserMixChange={handleUserMixChange}
                registerSection={registerSection}
              />
            </main>

            <SummarySidebar
              customerName={formData.companyName}
              estimateName={formData.estimateName}
              onRenameEstimate={(name) => handleChange('estimateName', name)}
              annualCost={result.annualCost}
              totalAppPoints={result.totalAppPoints}
              moduleCount={formData.selectedApplications.length}
              segments={segments}
              legend={legend}
              onReview={() => setView('review')}
            />
          </div>

          <footer className="estimator__footer">
            <div className="estimator__footer-spacer" style={{ flex: 1 }} />
            <Button kind="secondary" size="2xl">Back</Button>
            <Button kind="primary" size="2xl">Save and start new estimate</Button>
          </footer>
        </>
      ) : (
        <>
          <div className="estimator__body">
            <main className="estimator__main">
              <ReviewPage
                formData={formData}
                result={result}
                perTierPoints={perTierPoints}
                totalUsers={totalUsers}
                onBack={() => setView('form')}
              />
            </main>

            <SummarySidebar
              customerName={formData.companyName}
              estimateName={formData.estimateName}
              onRenameEstimate={(name) => handleChange('estimateName', name)}
              annualCost={result.annualCost}
              totalAppPoints={result.totalAppPoints}
              moduleCount={formData.selectedApplications.length}
              segments={segments}
              legend={legend}
              onReview={() => setView('review')}
              showReview={false}
            />
          </div>

          <footer className="estimator__footer">
            <Button kind="secondary" size="2xl" onClick={() => setView('form')}>
              Back to configuration
            </Button>
            <Button kind="primary" size="2xl">Save and start new estimate</Button>
          </footer>
        </>
      )}
    </div>
    </Theme>
  );
}

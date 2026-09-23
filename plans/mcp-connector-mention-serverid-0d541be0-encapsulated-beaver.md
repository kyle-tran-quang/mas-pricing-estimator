# Maximo Pricing Estimator — Interactive Prototype

## Context

The user wants an interactive prototype of the **IBM Sales Configurator — Maximo Pricing Estimator**, built from a pasted Figma design and using **only Carbon Design System components**. As the user configures modules/users/environments in the main content area, the **left sidebar visualization** (a proportional stacked "AppPoints" bar + users-mix legend + running cost/AppPoints/module stats) must update **live**.

The repo is a blank Vite + React 19 + Tailwind v4 scaffold. The pricing engine already exists at `src/imports/calculateEstimate.js` and is fully written, but it imports from `./constants` which **does not exist** — so it is currently non-functional. The design supplies enough numbers to author that constants module.

Design reference: Figma `Q2sUw98tPhcYuOVCr1lI2P`, node `1:17612`. Fonts are the IBM Plex family (Sans, Sans Condensed, Mono) — Carbon's default typeface, wired via Carbon styles.

## Approach

Build a single scrolling configuration page (matching the design) with a fixed right-side step nav and a persistent left summary sidebar, all composed from Carbon React components. A central `formData` state object drives `calculateEstimate()`, whose output feeds the live sidebar.

### 1. Dependencies & Carbon setup — no Tailwind
- Install `@carbon/react` and `@carbon/icons-react` (React 19 compatible).
- **Remove Tailwind from the styling path.** Replace the `@import 'tailwindcss';` line in `src/index.css` with Carbon's prebuilt CSS (`@import '@carbon/styles/css/styles.css';`) using the `g10` (white) theme to match the light design. Tailwind stays in devDependencies but is no longer imported/used; no Tailwind utility classes anywhere in the JSX.
- All layout and styling comes from **Carbon components + Carbon layout primitives + Carbon design tokens**. For the few custom pieces (the proportional stacked bar, legend grid, three-column shell), write a small hand-authored CSS file (`src/index.css` / component-scoped classes) that references Carbon token CSS variables (spacing `--cds-spacing-*`, colors `--cds-*`, type tokens) — never raw hex or Tailwind classes.

### 2. Recreate the missing constants — `src/imports/constants.js`
Author the module the engine imports, deriving values from the design's displayed numbers. Must export exactly: `USER_TIER_APPPOINTS`, `APPLICATIONS`, `ADVANCED_COMPONENTS`, `DATABASE_TYPES`, `DATABASE_REPLICA_APPPOINTS`, `DEPLOYMENT_ARCHITECTURE`, `PRICING`, and helpers `getApplicationById`, `getAddonById`, `getEnvironmentSizeById` (shapes inferred from how `calculateEstimate.js` reads them: `app.baseInstall`, `app.minimumAppPoints`, `app.name`; `sizeData.appPoints`/`.label`; `tierData.concurrent`/`.authorized`/`.label`; `PRICING.basePointCost`, `PRICING.contractTermDiscounts`).
- User tiers from design: Premium, Base (15/concurrent, 5/authorized), Limited (15/5), Self-service (15/5), etc.
- Module/app AppPoints from the sidebar viz: Installation+Db 10, Optimizer 20, Scheduler 50, Mobile, Spatial 100, Manage 200 — with the colored segment palette shown.
- `basePointCost` chosen so totals land near the design's `$189,550/year` at 380 AppPoints; contract-term discounts for 1/3/5 years.
- **Assumption flagged:** exact private pricing wasn't provided, so values are reasonable approximations consistent with the design's on-screen figures. Easy to tune in one file.

### 3. Component structure — `src/components/`
- `AppShell.tsx` — Carbon `Header`, `HeaderName` ("IBM Sales Configurator"), `HeaderGlobalBar`/`HeaderGlobalAction` (data cards, AI, user avatar), and the "Maximo" switcher button.
- `SummarySidebar.tsx` (left, 400px) — `Configuration summary` heading + customer name; three stat blocks (annual cost / AppPoints / modules); the **custom proportional stacked AppPoints bar** (Carbon tokens, colored segments per active module, heights scaling with AppPoints, updating live); Carbon `Button` "Review estimate"; Users-mix legend grid (colored dots + counts).
- `StepNav.tsx` (right) — vertical progress list: 1. Industry, 2. Environment, 3. Plan, 4. Users mix, 5. Connect (Carbon `ProgressIndicator` vertical, or a token-styled list; scrolls/anchors to sections).
- `ConfigForm.tsx` (center, the scrolling steps) composed of section components:
  - `IndustryStep` — radio grid of industries (Aviation, Nuclear, Energy & Utilities, Oil & Gas, Transportation, Civil Infrastructure, Manufacturing, Life Sciences, Government/Defense, Other) using Carbon `RadioButton` rows/tiles + icons from `@carbon/icons-react`.
  - `EnvironmentStep` — SaaS vs On-Premises selectable `RadioTile`s (`TileGroup`).
  - `PlanStep` — selectable application `SelectableTile`s (Managing assets, Real-time monitoring, Automated visual inspection, Predict failures, IT assets & service, Buildings/leases) with `Tag`s.
  - `EnvironmentSizeStep` — Small/Medium/Large/Enterprise `RadioTile`s.
  - `UserPoolStep` — per-tier rows (Premium/Base/Limited/Self-service) each with two Carbon `NumberInput`s (Concurrent, Authorized) and a read-only `Tag` showing computed AppPoints per tier.
  - `ContractTermStep` — 1 Year / 3 Years (Recommended) / 5 Years / Not sure `RadioTile`s.
  - "More Options" `Accordion`/expandable sections where the design shows them.
- Bottom action bar — `Back` (secondary) + `Save and start new estimate` (primary) Carbon `Button`s.

### 4. State & live calculation — `src/App.tsx`
- Hold one `formData` state (selectedApplications, userMix, environments, industry, deploymentModel, contractTerm, etc.) shaped to what `calculateEstimate` expects.
- On every change, call `calculateEstimate(formData)` (memoized) and pass results (`totalAppPoints`, `annualCost`, `userBreakdownRows`, `breakdown`, module segments) to `SummarySidebar` so the visualization and stats update live.
- Layout: three-column responsive layout (sidebar | form | step nav) built with Carbon `Grid`/`Column` (or a token-based CSS flex layout using `--cds-spacing-*`), collapsing to stacked columns at narrow widths. No Tailwind.

### 5. Assets & fonts
- IBM Plex fonts come with Carbon styles — no manual `@font-face` needed. No blocked fonts.
- Prefer `@carbon/icons-react` icons over the design's raw SVG assets where a Carbon equivalent exists (industry/module icons: Plane, Nuclear/Navaid, Lightning, GasStation, Bus, Industry, Building, Sprout, Finance, etc.). Only copy design SVGs into `public/assets` if no Carbon icon matches.

## Critical files
- `package.json` — add `@carbon/react`, `@carbon/icons-react`.
- `src/index.css` — replace the Tailwind import with Carbon styles + small token-based custom CSS.
- `src/imports/constants.js` — **new**, unblocks `calculateEstimate.js` (reuse the existing engine as-is; do not rewrite it).
- `src/App.tsx` — state + layout + wiring.
- `src/components/*` — the components above.

## Verification
- `pnpm dev` is already running; confirm the app renders with no console errors.
- Interact: select modules → left stacked bar adds/grows segments and AppPoints/cost stats update; change user Concurrent/Authorized inputs → per-tier `Tag` and totals update; switch contract term → annual cost changes per discount.
- Run `pnpm build` once to confirm the Carbon + React 19 setup compiles (no Tailwind in the pipeline).
- Visually compare against the Figma screenshot (three-column layout, header, step nav, bottom action bar).

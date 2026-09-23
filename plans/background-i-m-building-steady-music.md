# Rework the "Review estimate" page

## Context

The Maximo Pricing Estimator has a form view (persistent left `SummarySidebar` with the AppPoints chart, center `ConfigForm`, right `StepNav`) and a review view reached via the sidebar's "Review estimate" button. Today the review view (`src/App.tsx` → `src/components/ReviewPage.tsx`) renders a **bespoke, self-contained 2-column layout**: it re-creates its own left panel (heading + KPIs + a duplicate chart + user mix) and shows a right-hand `StructuredList` detail. This duplicates the sidebar chart, breaks visual consistency with the config view, and leaves the richest data source — `result.breakdown` (the full per-line-item AppPoints breakdown from `calculateEstimate.js`) — completely unused.

The user wants the review page to instead: **keep the persistent left `SummarySidebar`** (the same 400px chart sidebar as the config view), **populate the wide main body** with the estimate details, and **add an inline "back" button**. The information architecture and Carbon patterns should follow the attached `MyEstimates.jsx` reference: modules rendered as `Tag`s, a Carbon `DataTable` for the line-item breakdown, a `formatCurrency` helper, and grouped detail sections (deployment, environments, user mix, database, add-ons, contract term). All Carbon component choices were validated against Carbon MCP (`DataTable`, `StructuredList`).

## Approach

### 1. `src/App.tsx` — restructure the review view to a 3-part shell
Replace the current review branch (lines ~232–252) so it mirrors the form view's body structure:
- Render the persistent `<SummarySidebar …>` (same props already computed: `customerName`, `annualCost`, `totalAppPoints`, `moduleCount`, `segments`, `legend`) as the left column inside `.estimator__body` (not `--review`).
- Add a new prop to `SummarySidebar` to suppress/replace the "Review estimate" CTA when already on the review page (e.g. `showReview={false}` — see step 4). This avoids a dead "Review" button while reviewing.
- Render `<main className="estimator__main">` containing the reworked `<ReviewDetails …>` (the renamed/rewritten detail component) as the wide body. No `StepNav` in review mode.
- Keep the footer "Back to configuration" / "Save and start new estimate" buttons.
- Pass the estimate data the detail body needs: `formData`, `result` (whole object, to expose `breakdown`, `annualCost`, `totalAppPoints`, `termDiscount`, `totalCost`, `monthlyCost`), `perTierPoints`, `totalUsers`, and `onBack={() => setView('form')}`.

### 2. Rewrite `src/components/ReviewPage.tsx` as the main-body detail view
Remove the bespoke left panel and duplicate chart entirely (the sidebar now owns that). The component becomes a single scrolling detail column:
- **Inline back button** at the top: `<Button kind="ghost" size="sm" renderIcon={ArrowLeft} onClick={onBack}>Back to configuration</Button>` (import `ArrowLeft` from `@carbon/icons-react`).
- **Header block**: estimate/company name as the page title, plus the selected modules rendered as a row of `<Tag type="…">` (mirrors the reference JSX `modules` Tags), reusing each app's `color` from `APPLICATIONS`.
- **KPI row**: reuse the existing `.review-page__stats` markup (annual cost, total AppPoints, module count) or a small Carbon-token stat row.
- **AppPoints breakdown `DataTable`** (the centerpiece, per the reference IA and Carbon MCP `DataTable` default pattern): columns `Line item`, `Detail`, `AppPoints`, driven by `result.breakdown`. Map each `breakdown` entry `{ item, appPoints, count, details }` to a row; render the `appPoints` right-aligned. Use `DataTable` with static `Table`/`TableHead`/`TableBody`/`TableRow`/`TableCell` (read-only, no selection/toolbar). Add a total row (or `TableContainer` description) showing `totalAppPoints`.
- **Detail `StructuredList` groups** (flush, following current styling and reference data shape), enriched beyond today:
  - *Deployment*: deployment model, deployment architecture (`DEPLOYMENT_ARCHITECTURE` label + AppPoints), database type (`DATABASE_TYPES`) + replicas.
  - *Environments*: environment size (`ENVIRONMENT_SIZES` label + AppPoints).
  - *Add-ons / advanced components*: list selected `ADDONS` and `ADVANCED_COMPONENTS` as Tags/rows (currently omitted from the UI though present in `formData` and `breakdown`).
  - *User pool*: per-tier concurrent/authorized + `perTierPoints` AP Tags (keep existing logic).
  - *Pricing summary*: total AppPoints, annual subscription via `formatCurrency`, and multi-year total using `result.totalCost` + `result.termDiscount` (reuse the real computed values instead of re-deriving discount strings).
- Add a shared `formatCurrency` helper matching the reference (`Intl.NumberFormat` USD, 0 fraction digits) to replace the lossy `fmt()` K/M rounding for the pricing summary; keep compact `fmt()` only where space-constrained if needed.
- Reuse existing constant getters/maps already imported (`USER_TIER_APPPOINTS`, `APPLICATIONS`, `ENVIRONMENT_SIZES`) plus add `DEPLOYMENT_ARCHITECTURE`, `DATABASE_TYPES`, `ADDONS`, `ADVANCED_COMPONENTS` from `src/imports/constants.js`.

Consider renaming the file/component to `ReviewDetails` for clarity, or keep `ReviewPage` to minimize import churn (either is fine; keep the export default).

### 3. `src/index.css` — layout/styling for the new main body
- The review body now reuses `.estimator__body` + `.estimator__main` (no longer the `--review` 2-column split). Remove or repurpose `.review-page` / `.review-page__left` / `.review-page__right` rules that are no longer used, and add classes for the new single-column detail (e.g. `.review-detail`, header, module-tag row, DataTable wrapper spacing, section spacing). Match existing spacing conventions (32/48px, `max-width` ~720–960px for the detail column).
- Keep styling token-forward where practical (`var(--cds-*)`), consistent with the existing `.review-page__left` layer usage; avoid introducing an unlayered global reset.

### 4. `src/components/SummarySidebar.tsx` — optional "Review" CTA suppression
Add an optional prop (default `true`) such as `showReview?: boolean` (or `reviewMode?: boolean`) so the persistent sidebar can hide/disable the "Review estimate" button when it is already displayed alongside the review body. App passes `false` in the review branch.

## Critical files
- `src/App.tsx` — review-view branch restructure (reuse `SummarySidebar` + `estimator__main`, pass full `result`).
- `src/components/ReviewPage.tsx` — rewrite as single-column main-body detail (Tags, `DataTable` breakdown, `StructuredList` groups, inline back button, `formatCurrency`).
- `src/components/SummarySidebar.tsx` — optional prop to suppress the review CTA in review mode.
- `src/index.css` — swap review layout to reuse `.estimator__main`; add `.review-detail*` classes; retire unused `.review-page__left/right` rules.
- Reference only (no edits): `src/imports/calculateEstimate.js` (`result.breakdown` shape), `src/imports/constants.js` (labels/getters), `src/imports/MyEstimates.jsx` (IA reference).

## Verification
- Dev server is already running on `$PORT`; open the preview.
- From the config view, click **Review estimate** in the left sidebar → confirm the persistent 400px chart sidebar remains on the left and the wide main body shows: module Tags, the KPI row, the `DataTable` AppPoints breakdown (rows summing to `totalAppPoints`), the enriched detail sections, and the pricing summary with correctly formatted currency and multi-year total.
- Confirm the inline **Back** button (top of main body) and the footer **Back to configuration** button both return to the form view.
- Toggle applications, environment size, database/add-ons, contract term, and user mix in the form, re-enter review, and confirm every value and the breakdown table update live.
- Check the responsive breakpoint (~`index.css` line 1144) still collapses/hides the sidebar sensibly in review mode.

---

# Round 2 — Zero start, empty states, sequential chart colors

## Context

On load the estimator seeds a sample estimate (`INITIAL_FORM` in `src/App.tsx` pre-selects the `manage` app and a non-zero `userMix`), so the total is never `$0`. The user wants the estimate to **start at zero** until they choose something, with a proper **empty state** for the AppPoints chart, and wants each chart segment to be a **distinct color drawn sequentially from an ordered palette** that extends as more items are configured. After the Round 1 rework the AppPoints chart lives **only** in `src/components/SummarySidebar.tsx` (persistent across both the form and review views), so this round is scoped to `App.tsx`, `SummarySidebar.tsx`, and `index.css`.

Decisions confirmed with the user: **(1)** sequential categorical palette — each visible segment gets the next distinct color in the order it is added; **(2)** keep identity fields (company name, industry, deployment defaults) but zero out all apps and users so the load-time total is `$0 / 0 AP`.

## Approach

### 1. `src/App.tsx` — zero the initial estimate
In `INITIAL_FORM`, keep `estimateName`/`companyName`/`industry`/`deploymentModel`/`environmentSize`/`environments`/`database`/`deploymentArchitecture`/`contractTerm` as-is (all 0-AppPoint defaults), but:
- set `selectedApplications: []`,
- set every `userMix` tier to `{ concurrent: 0, authorized: 0 }`.

This yields `result.totalAppPoints === 0` and `result.annualCost === 0` via the existing `calculateEstimate` memo — no engine changes needed.

### 2. `src/App.tsx` — segments: conditional base + sequential color index
In the `segments` `useMemo` (currently always pushes a hardcoded `base` "Installation + Db" segment):
- Only push the `base` segment when `formData.selectedApplications.length > 0` (platform install is meaningless with nothing selected), so `segments` is truly `[]` on a fresh/zeroed estimate and the empty state shows.
- Replace the per-segment semantic `color: SegColor` with a **running `colorIndex`**: assign `colorIndex = i++` to each segment in the order it is pushed (base, then each selected app, then env, arch, users). This drives the sequential palette. Drop the `app.color as SegColor` usage for the chart (app colors still feed the Review page module Tags, unaffected).
- The `legend` (user-mix) still uses the separate `TIER_COLORS` and is unchanged.

### 3. `src/components/SummarySidebar.tsx` — palette + empty state
- Replace the local `SEG_COLORS` map (which has the `blue` bg bug `#ffffff` making the base bar render white) with an **ordered `VIZ_PALETTE`** array of ~10 distinct `{ bg, border }` pairs (Carbon categorical hues, e.g. blue `#edf5ff/#0f62fe`, purple `#f6f2ff/#8a3ffc`, teal `#d9fbfb/#009d9a`, cyan `#e5f6ff/#1192e8`, green `#defbe6/#24a148`, magenta `#fff0f7/#ee5396`, yellow `#fcf4d6/#b28600`, red `#fff1f1/#da1e28`, cool-gray `#f2f4f8/#697077`, indigo `#e8eaff/#3538cd`). Export it so it can be reused.
- Change the `VizSegment` interface: replace `color: SegColor` with `colorIndex: number`; keep the `SegColor` export only if still referenced elsewhere, otherwise remove it and its `App.tsx` import.
- In the bars map, resolve `const { bg, border } = VIZ_PALETTE[seg.colorIndex % VIZ_PALETTE.length]`.
- **Empty state:** when `segments.length === 0`, render a richer placeholder inside `.viz__bars` — keep the "AppPoints" axis visible, show a dashed ghost bar plus muted prompt copy "Select applications to start your estimate" (replacing the bare single-line `.viz__empty` text). The KPI stats already render `$0` / `0` / `0` cleanly via `formatCost(0)`.

### 4. `src/index.css` — empty-state styling
Upgrade `.viz__empty` into a centered, full-height dashed placeholder (dashed 1px border in `#c6c6c6`, muted `#525252` text, min-height matching a typical bar so the sidebar doesn't collapse). Optionally add a `.viz__empty-bar` dashed ghost-bar element if the markup uses one. No palette values belong in CSS — colors are applied via the existing `--seg-bg`/`--seg-border` custom properties set inline from `VIZ_PALETTE`.

## Critical files
- `src/App.tsx` — `INITIAL_FORM` zeroing; `segments` memo (conditional base, sequential `colorIndex`).
- `src/components/SummarySidebar.tsx` — `VIZ_PALETTE`, `VizSegment.colorIndex`, palette resolution, empty-state markup.
- `src/index.css` — `.viz__empty` (and optional ghost bar) styling.

## Verification
- Load the app: sidebar shows `$0/year`, `0 AP`, `0 modules`, and the chart shows the empty-state placeholder ("Select applications to start your estimate"), not a white/base bar.
- Select one application → base + app segments appear in the first two palette colors; add more apps/environment size/dedicated architecture/users and confirm each new segment takes the **next distinct** palette color in order, with no white bar and no color collisions.
- Zero everything back out → chart returns to the empty state and totals return to `$0 / 0 AP`.
- Enter Review with a non-empty config and confirm the persistent sidebar chart matches the form view exactly (same colors/order).

---

# Round 3 — Tablet & phone usability

## Context

The estimator was built for desktop. Only two `@media` blocks exist in `src/index.css`: `1056px` (Carbon `lg` — stacks `.estimator__body` to a column, un-sticks and full-widths the 400px `.summary` sidebar and 200px `.stepnav`, drops the config grids 3→2) and `672px` (Carbon `md` — grids →1 column, tightens form/review padding). Below those, several fixed-width and no-wrap elements still break: the sticky footer's two `size="2xl"` buttons (`min-width:232px; height:80px`, right-aligned, no wrap → ~464px+ horizontal overflow on a ~375–414px phone — the single biggest breakage), the always-2-column `.legend-grid`, the `.userpool__summary` flex row (`gap:48px`, no wrap), the review `StructuredList` first cell (`min-width:180px`) and `.review-detail__groups` (`minmax(320px,1fr)`) overflowing tables under ~360px, `.summary` keeping `padding:32px` when stacked full-width, and `.review-detail__title` fixed at 32px. On stacking (≤1056px) the full-width chart sidebar also pushes the actual form far down the page. Goal: make the whole flow usable and overflow-free from tablet (~768px) down to small phones (~360–414px), staying within Carbon's grid breakpoints and token conventions. No functional/engine changes — layout only, plus one small interaction (collapsible chart on narrow screens).

Decision confirmed with the user: **the persistent AppPoints chart sidebar becomes collapsible on narrow screens** (stacked, collapsed by default so the form/review body is reachable immediately, with a toggle to expand the chart).

## Approach

### 1. `src/components/SummarySidebar.tsx` — persistent KPI bar + collapsible chart
- **Persistent price + AppPoints on mobile (user requirement):** the KPI stats block (Annual cost, AppPoints total, and Modules) stays **always visible and sticky** on narrow screens so the running total never scrolls out of view. Keep the existing `.summary__stats` markup, but ensure it lives *outside* the collapsible chart wrapper. On stacked/narrow layouts it becomes a sticky mini-summary pinned to the top of the sidebar block (`position: sticky; top: 48px`, below the 48px header) — see step 4. On desktop it keeps its normal in-flow position inside the sticky 400px sidebar.
- Add local `const [open, setOpen] = useState(false)` for the collapsed/expanded state of the **chart + legend** region only (the persistent KPI bar is never collapsed).
- Add a toggle control shown only on narrow screens (CSS-gated, see step 4): a full-width Carbon `Button kind="ghost"` with `renderIcon={ChevronDown/ChevronUp}` (from `@carbon/icons-react`), `aria-expanded={open}`, `aria-controls` pointing at the chart region `id`. On desktop the chart is always shown and the toggle is hidden.
- Wrap the `.viz-wrapper` (+ the `legend` block) in a collapsible container (e.g. `.summary__collapse` with an `--open` modifier) so CSS can hide it when collapsed at narrow widths while always showing it at ≥1056px. Keep the existing empty-state markup untouched.
- Guard against the toggle appearing at desktop widths by gating purely in CSS (the button element can render always; `display:none` above the breakpoint) to avoid JS resize listeners.

### 2. `src/App.tsx` — footer buttons: allow wrap/stack
No structural change to the shell. The footer overflow is fixed in CSS (step 3), but remove the reliance on the desktop-only spacer where it forces layout: keep the `<div style={{flex:1}}/>` spacer for desktop right-alignment, but ensure it collapses under the footer media rule (CSS `.estimator__footer > div[style]`… — instead prefer adding a class). Minimal-churn option: add `className="estimator__footer-spacer"` to the spacer div so CSS can `display:none` it on phone. (Button labels stay the same.)

### 3. `src/index.css` — footer, and new phone breakpoint
- **Footer wrap (in existing `672px` block or a new `480px` block):** set `.estimator__footer { flex-wrap: wrap; height: auto; gap: 8px; padding: 8px 16px; }`, drop the fixed `height:80px`, and change `.estimator__footer .cds--btn { min-width: 0; flex: 1 1 auto; height: 48px; }` so the two buttons share the row (or stack) full-width without overflow. Hide `.estimator__footer-spacer` here. Consider `size` handling: the `2xl` buttons render 80px tall by CSS override — the new rule reduces them to a normal touch height on phone.
- **`.summary` stacked padding:** in the `1056px` block (or the new phone block) reduce `.summary { padding: 24px 16px; }` when full-width so it doesn't eat horizontal space; keep `gap` sensible.
- **Persistent KPI bar (≤1056px):** make `.summary__stats` sticky at the top of the stacked sidebar — `position: sticky; top: 48px; z-index: 3; background: #f4f4f4; padding: 12px 16px; margin: 0 -16px;` (compact horizontal row of Annual cost + AppPoints total + Modules) so price and AppPoints stay visible while the user scrolls the form. At ≥1056px reset it to static (in-flow within the sticky 400px sidebar). Ensure it sits above the collapsible chart in source order.
- **`.legend-grid`:** add to the `672px` block `grid-template-columns: 1fr;` (or keep 2-up at tablet, 1-up at phone) so user-mix legend chips don't cram.
- **`.userpool__summary`:** add `flex-wrap: wrap; gap: 16px;` at `≤672px` to stop the 48px-gap row overflowing.
- **Review tables/groups:** at `≤672px` set `.review-detail__groups { grid-template-columns: 1fr; }` (already effectively single via auto-fit, but pin it), relax the StructuredList first cell (`.review-detail .cds--structured-list td:first-child { min-width: 0; max-width: none; }`), and allow the AppPoints `DataTable` to scroll horizontally if needed (`.review-detail .cds--data-table-container { overflow-x: auto; }`). Reduce `.review-detail__title` to ~24px at `≤672px`.
- **New phone breakpoint (`@media (max-width: 480px)` or `360px` as needed):** any remaining tightening — `.summary__stats` allow wrap (already wraps), `.review-detail { padding: 16px 12px 48px; }`, ensure no element sets a `min-width` wider than the viewport.
- **Collapsible sidebar rules:** below `1056px`, `.summary__collapse:not(.summary__collapse--open) { display: none; }` and show `.summary__toggle { display:flex }`; at ≥1056px force `.summary__collapse { display:flex !important }` and `.summary__toggle { display:none }`. Keep KPI stats outside the collapse wrapper so they always show.
- Preserve cascade-layer usage already in the file; do **not** add an unlayered universal reset.

### 4. Tablet check (~768px, already below 1056px)
Confirm the single-column stack reads well: full-width KPI stats + collapsed chart toggle at top, then the form with 2-up grids, then the full-width `.stepnav` block, then the wrapped footer. Stepnav at full width becomes a stack of 64px rows — acceptable; optionally at `≤1056px` render stepnav items in a horizontal wrap (`.stepnav { display:flex; flex-wrap:wrap }`, `.stepnav__item { width:auto; flex:1 1 auto }`) to save vertical space — include as an optional enhancement, not required.

## Critical files
- `src/components/SummarySidebar.tsx` — collapsible chart/legend (`open` state, ghost toggle button with Chevron icons, `.summary__collapse` wrapper); KPI stats stay always visible.
- `src/App.tsx` — add `estimator__footer-spacer` class to the footer spacer div (minimal change) so CSS can hide it on phone.
- `src/index.css` — footer wrap/height rules; `.summary` stacked padding; `.legend-grid`, `.userpool__summary`, review-table/group/title rules at `≤672px`; new `≤480px` phone block; collapsible-sidebar visibility rules gated by the `1056px` breakpoint.

## Verification
- Dev server already running; open the preview and use browser responsive mode.
- **Tablet 768px:** single column, no horizontal scroll; chart collapsed with a working toggle; 2-up config grids; footer buttons fit on one row.
- **Phone 390px (and 360px):** no horizontal overflow anywhere; footer buttons wrap/stack full-width at ~48px height (not 80px, not 464px-wide); config grids 1-up; user-mix legend and `.userpool__summary` don't cram; expanding the chart toggle reveals the AppPoints bars and legend, collapsing hides them.
- **Persistent KPI (mobile):** scroll the form on a phone and confirm the Annual cost + AppPoints total (+ Modules) bar stays pinned/visible at the top and updates live as the config changes — never scrolls out of view whether the chart is collapsed or expanded.
- **Review view on phone:** module Tags wrap; AppPoints `DataTable` either fits or scrolls horizontally within its container (page doesn't); `StructuredList` rows don't overflow; title is reduced.
- **Desktop ≥1056px:** unchanged — sidebar sticky at 400px, chart always visible (no toggle), stepnav 200px, footer buttons right-aligned at original size.
- Toggle keyboard/a11y: `aria-expanded` reflects state; region is reachable and labeled.

---

# Round 4 — Mobile redesign (supersedes Round 3's mobile treatment)

## Context

Round 3 made the app *fit* on small screens but the mobile result reads poorly: the AppPoints summary stacks full-width at the **top** (pushing the form down), the Round 3 sticky KPI bar uses negative margins that throw content **out of alignment**, the step navigation is a tall vertical list, the top Carbon `Header` renders all four `HeaderGlobalAction` icons at once (crowded), and content still doesn't sit flush to the device width (asymmetric form padding `16px 32px 64px 16px` + a `border-left` on the stacked form). The user wants a proper mobile layout:
1. **Summary docked to the bottom, coupled with the Back/Save buttons**; expanding it reveals the chart sliding up **from the bottom**.
2. **Alignment fixed** — content flush to the viewport, no stray negative margins or borders.
3. **Step tabs horizontal and sticky at the top** while scrolling (instead of the vertical rail).
4. **Header made mobile-responsive** — hamburger opens a Carbon `SideNav` panel holding the actions instead of showing all four icons at once (user-chosen).
5. **Content fits the device width.**

This round **revises the mobile (`≤1056px` / `≤672px`) CSS from Round 3** — specifically the top-sticky KPI bar, the top full-width sidebar, and the collapse-in-place behavior — replacing them with a bottom dock, horizontal top tabs, and a SideNav header. Desktop (`≥1056px`) stays exactly as it is today. No pricing/engine changes.

## Approach

### 1. `src/components/AppShell.tsx` — hamburger + `SideNav` panel (mobile)
- Switch to Carbon's `HeaderContainer` render-prop pattern so the hamburger state is managed by Carbon: `render={({ isSideNavExpanded, onClickSideNavExpand }) => (…)}`.
- Wire `HeaderMenuButton` to `onClick={onClickSideNavExpand}` with `isActive={isSideNavExpanded}` and `aria-expanded`.
- Add a `<SideNav aria-label="Actions" expanded={isSideNavExpanded} isPersistent={false} onSideNavBlur={onClickSideNavExpand}>` containing `<SideNavItems>` with a `SideNavLink` (`renderIcon`) for each of the four current actions (Data cards, AI assistant, User profile, Product switcher).
- Keep the existing `HeaderGlobalBar` actions for desktop, but **hide them on mobile via CSS** (`≤1056px`: `.cds--header__global { display: none; }`) so mobile shows only the hamburger + `HeaderName`, with the four actions living in the SideNav. `HeaderMenuButton` is already auto-hidden by Carbon at `≥lg`, so the SideNav is desktop-inert.

### 2. `src/components/StepNav.tsx` + CSS — horizontal sticky tabs on mobile
- No markup change needed; the existing `.stepnav` / `.stepnav__item` map works. Drive the layout from CSS.
- On mobile (`≤1056px`): make `.estimator__main { flex-direction: column; }` and give the nav `order: -1` so it sits **above** the form; `.stepnav { position: sticky; top: 48px; z-index: 5; display: flex; flex-wrap: nowrap; overflow-x: auto; width: 100%; min-height: 0; padding: 0; background: #f4f4f4; }`.
- Items become horizontal tabs: `.stepnav__item { flex: 0 0 auto; width: auto; height: 48px; padding: 0 16px; }`, move the active indicator from the left edge to the **bottom** (`.stepnav__item::before { top: auto; bottom: 0; left: 0; width: 100%; height: 3px; }`). Remove the `<ol>` number spacing quirk visually if cramped (keep numbers, tighten `margin-left`).

### 3. Bottom summary dock coupled with actions (`SummarySidebar.tsx` + CSS)
Reuse the single `SummarySidebar` component (no duplication) and re-dock it at the bottom on mobile via CSS + a small markup reorder using `order`.
- **Markup:** keep the existing children (title-block, `.summary__stats`, `.summary__toggle`, `.summary__collapse` [chart + legend], `.summary__review`). The toggle label/icon already flips open/closed. Ensure the `.summary__collapse` region can scroll.
- **Mobile CSS (`≤1056px`):**
  - Pin the sidebar as a fixed bottom sheet directly above the footer: `.summary { position: fixed; left: 0; right: 0; bottom: var(--dock-actions-h); z-index: 6; width: 100%; max-height: 80vh; padding: 0; gap: 0; background: #f4f4f4; border-top: 1px solid #c6c6c6; box-shadow: 0 -2px 6px rgba(0,0,0,0.12); }` where `--dock-actions-h` (~56px) is the footer height.
  - Collapsed bar = **mini KPI + toggle**, always visible, flush to the footer: show `.summary__stats` (compact horizontal, `order: 2`, no negative margins — fixes the alignment bug) and `.summary__toggle` (`order: 3`, full-width row); **hide** `.summary__title-block` on mobile.
  - Expanded sheet grows **upward from the bottom**: `.summary__collapse { order: 1; overflow-y: auto; max-height: 60vh; padding: 16px; }`, shown only when `--open`. Put `.summary__review` (the "Review estimate" CTA) inside/adjacent to the collapse region so it stays reachable on mobile (`order: 1`), hidden from the collapsed bar.
  - Optional scrim: a `::before`/overlay behind the expanded sheet is nice-to-have; skip unless trivial.
- **Reserve space so content isn't hidden behind the dock:** on mobile add bottom padding to the scroll area — `.estimator__body { padding-bottom: calc(var(--dock-actions-h) + 72px); }` (footer + collapsed mini-bar height) so the last form fields clear the fixed dock.
- **Remove the Round 3 mobile stat treatment** (the `position: sticky; top: 48px; margin: 0 -16px` on `.summary__stats`) — it's replaced by the bottom dock and was the source of the misalignment.

### 4. Footer stays fixed at the very bottom, coupled under the summary
- `.estimator__footer` already sticky; on mobile make it `position: fixed; bottom: 0; left: 0; right: 0; z-index: 7; height: var(--dock-actions-h);` with the wrapped full-width Back/Save buttons from Round 3 (`flex: 1 1 auto; height: 48px`). The summary mini-bar sits immediately above it (its `bottom: var(--dock-actions-h)`), so the two read as one coupled bottom dock. Define `--dock-actions-h` once (e.g. on `.estimator` or `:root`).

### 5. Width/alignment cleanup (`index.css`)
- On mobile remove the form's `border-left` and asymmetric padding: `.estimator__form { padding: 16px; border-left: none; }` (extend the existing `≤672px` rule up into `≤1056px` where the layout is already stacked).
- Ensure `box-sizing: border-box` holds for layout containers (Carbon sets it broadly; add targeted rules only where an element overflows). Verify no element keeps a `min-width`/fixed `width` wider than the viewport at mobile (the 400px `.summary` and 200px `.stepnav` are overridden above; double-check `.review-detail` tables from Round 3 still scroll within their container).
- Do **not** add an unlayered universal reset; keep changes scoped to existing class names within the current (non-layered) stylesheet conventions.

## Critical files
- `src/components/AppShell.tsx` — `HeaderContainer` render prop, `HeaderMenuButton` wired to `SideNav`, four actions mirrored into `SideNavItems`.
- `src/components/StepNav.tsx` — (likely no change; CSS-driven) horizontal tabs.
- `src/components/SummarySidebar.tsx` — ensure children order/classes support the bottom-dock reorder (title-block hideable, review CTA inside collapse); keep single source of the summary.
- `src/App.tsx` — no structural change expected (footer already present in both branches); confirm the footer + fixed summary coexist in form and review views.
- `src/index.css` — the bulk: define `--dock-actions-h`; revise the `≤1056px` and `≤672px` blocks (remove Round 3 top-sticky KPI, add bottom dock, fixed footer, horizontal sticky tabs, header global-bar hide, form padding/border cleanup, body bottom padding).

## Verification
- Dev server already running; open the preview in responsive mode.
- **Header (mobile ≤1056px):** only hamburger + "IBM Sales Configurator" show; tapping the hamburger opens the SideNav listing the four actions; tapping outside/blur closes it. Desktop ≥1056px still shows all four global icons and no hamburger.
- **Step tabs (mobile):** tabs are a horizontal, scrollable row pinned to the top (below the 48px header) and stay put while scrolling the form; the active tab shows a bottom indicator; tapping a tab scrolls to its section.
- **Bottom dock (mobile):** a summary mini-bar (price /year + AppPoints) sits directly above the Back/Save buttons as one coupled bottom unit; the form content scrolls above it and the last fields aren't hidden behind it. Tapping the toggle expands the chart + legend (and Review CTA) sliding up from the bottom; collapsing hides it while the mini KPI stays. Values update live.
- **Alignment/width:** at 390px and 360px there is no horizontal scroll, content sits flush to the edges (symmetric 16px padding, no stray left border/negative margins), and the review view's Tags/DataTable/StructuredList fit or scroll within their containers.
- **Desktop ≥1056px:** unchanged — left 400px sticky sidebar with always-visible chart, right 200px vertical step rail, top footer buttons, full header bar.

---

# Round 5 — Conversational Quote Builder in the chat

## Context

The AI chat panel (`ChatPanel.tsx` + `chatResponder.ts`) is currently deterministic keyword routing that only returns text — it cannot build a quote or touch the estimator. The user wants a multi-turn **Conversational Quote Builder**: the user describes a deal in natural language, the assistant asks clarifying questions, then produces a structured quote (industry, modules, deployment, user mix, environments, term, AppPoints, indicative annual price) with an **"Open in estimator"** action that auto-populates the estimator, plus optional inline **refinement** ("bump premium to 40", "change term to 5 years", "add non-prod environment").

All of this logic already exists — fully implemented, not stubbed — in the user-added `src/imports/ChatInterface.jsx` (`handleConversationalQuoteBuilder` L824–970, `parseInitialDealDescription` L638–673, `buildConversationalQuote` L675–715, `handleEstimateRefinement` L717–822, plus `INDUSTRY_PATTERNS`/`MODULE_RECOMMENDATIONS`). But that file is **orphaned** (imported nowhere), has **broken imports** (`../utils/chatConfigParser`, `../utils/chatCalculator`, `../pricingEngine/calculateEstimate` — none exist; the real engine is `src/imports/calculateEstimate.js`), is heavily inline-styled, and emits its config through a `window` CustomEvent nobody listens to. Per the user's decision, we **port its proven logic into the live `ChatPanel`** rather than adopt the orphaned file, keeping the current polished `.chatp` UI. The estimator's core fields in `ConfigForm` are already **controlled from `formData`** (`industry`, `deploymentModel`, `selectedApplications`, `environmentSize`, `userMix`, `contractTerm`), so driving `setFormData` in `App` makes an applied quote visibly populate the form and re-run `calculateEstimate` live.

## Approach

### 1. New pure module `src/components/quoteBuilder.ts`
Port and clean the logic from `ChatInterface.jsx` into typed, testable pure functions that import the **real** engine (`calculateEstimate` from `../imports/calculateEstimate`) and constants (`APPLICATIONS`, `USER_TIER_APPPOINTS`, `ENVIRONMENT_SIZES` from `../imports/constants`) and produce **real `FormData`** (from `src/types.ts`).
- **Constants (normalized to this project's IDs):**
  - `INDUSTRY_PATTERNS` → must emit valid `FormData.industry` IDs from ConfigForm's `INDUSTRIES`: `aviation, nuclear, energy, oilgas, transportation, civil, manufacturing, lifesciences, government, other` (fix ChatInterface's `oil-gas`/`civil-infrastructure`/`life-sciences`).
  - `MODULE_RECOMMENDATIONS` → filter to valid `APPLICATIONS` IDs: `manage, health, predict, monitor, visualInspection, collaborate` (drop `maximoIT`/`mref` which have no application).
- **Functions:**
  - `parseInitialDealDescription(text)` → `{ industry, userCount, modules[], contractTerm, hasExistingSystem }`.
  - `parseClarifyingAnswers(text)` → `{ roleCounts?: {premium,base,limited}, greenfield: boolean }` (reliability engineers→premium, supervisors→base, techs/office→limited).
  - `buildQuoteFormData(deal, answers)` → `FormData`: spread a zeroed base, set `industry`, `deploymentModel:'saas'`, `selectedApplications` (recommended modules, default `['manage']`), `environmentSize` by userCount thresholds (→ small/medium/large/enterprise + `environments.prod.size`), `userMix` (use parsed role counts else 15/60/25% split across premium/base/limited, into `concurrent` for the default `licensingModel`), `contractTerm` clamped to `1|3|5`, `companyName` if detectable.
  - `applyRefinement(text, prev: FormData): FormData | null` — add non-prod env, bump premium/base/limited, change term, add module(s); returns mutated `FormData` or `null` if nothing matched.
  - `advanceQuoteBuilder(ctx, userText)` → `{ reply: string; nextCtx: QuoteCtx; formData?: FormData }` — the state machine: trigger regex `/describe a deal|build.*quote|create.*quote|new deal|new opportunity/i` → `initial`; `initial` parses + asks the two clarifying questions → `clarifying`; `clarifying` builds the quote (calls `calculateEstimate` to embed AppPoints + annual price in the reply) and resets ctx. Types: `QuoteStage = 'idle' | 'initial' | 'clarifying'`.

### 2. `src/components/ChatPanel.tsx` — wire the state machine + handoff
- Add prop `onApplyConfig?: (fd: FormData) => void`.
- Add state `quoteCtx` (`{ stage, deal }`, default idle) and extend `ChatMessage` with optional `quoteConfig?: FormData`.
- In `send(raw)`, before the existing `getAssistantReply` fallback, run in order: (a) if the latest assistant message carries a `quoteConfig` and `applyRefinement(text, thatConfig)` returns non-null → append a refinement reply carrying the new `quoteConfig`; (b) else `advanceQuoteBuilder(quoteCtx, text)` — if it returns a reply, append it (attaching `formData` as `quoteConfig` when present) and update `quoteCtx`; (c) else fall back to `getAssistantReply` unchanged. Keep the 550ms "thinking" delay.
- Render an **"Open in estimator"** Carbon `Button` (with `Launch`/`ArrowRight` icon) on any assistant bubble that has `quoteConfig`, calling `onApplyConfig(msg.quoteConfig)`.
- Leave `chatResponder.ts` and `QUICK_ACTIONS` as-is (the "Build a quote…" chip text already matches the trigger regex, so it kicks off the builder).

### 3. `src/App.tsx` — receive the applied config
Pass `onApplyConfig={(fd) => { setFormData(fd); setView('form'); setCurrentStep(0); setChatOpen(false); }}` to `<ChatPanel>`. `result` recomputes via the existing `useMemo`, so the summary chart and estimator update immediately; scroll-spy/StepNav follow.

### 4. `src/index.css` — minor
Add a small `.chatp__estimate-actions` block (button spacing/margin) consistent with existing `.chatp__` tokens. No new resets.

## Critical files
- `src/components/quoteBuilder.ts` — NEW: ported pure logic (parse/build/refine/state-machine), typed to `FormData`, using real `calculateEstimate` + constants.
- `src/components/ChatPanel.tsx` — quote state machine in `send()`, `quoteConfig` on messages, "Open in estimator" CTA, `onApplyConfig` prop.
- `src/App.tsx` — pass `onApplyConfig` mapping to `setFormData`/`setView`/`setChatOpen`.
- `src/index.css` — `.chatp__estimate-actions` styling.
- Reference only (do NOT wire/import): `src/imports/ChatInterface.jsx` (logic source), `src/imports/constants.js`, `src/types.ts`, `src/components/ConfigForm.tsx` (confirms controlled fields).

## Verification
- Run `figma make verify-bootstrap` (expect success).
- In the preview: open the chat, send "Build me a quote" → assistant asks for a description; send e.g. "Utilities company, 200 users, needs predictive maintenance, 3-year deal" → assistant asks the two clarifying questions; answer "30 reliability engineers, 50 supervisors, 120 field techs. Greenfield." → assistant returns the structured quote with industry/modules/users/environments/term + AppPoints + indicative annual price, and an "Open in estimator" button.
- Click **Open in estimator** → chat closes, estimator switches to the form, and Industry/Deployment/Applications/Environment size/User mix/Contract term are populated; the summary chart + AppPoints/annual totals reflect the quote.
- Refine: with a built quote, send "bump premium to 40" / "change term to 5 years" / "add non-prod environment" → the reply shows recalculated AppPoints/pricing and the latest "Open in estimator" applies the refined config.
- Confirm non-quote messages still get the normal `chatResponder` answers.

---

# Round 6 — Inline-editable estimate name (desktop sidebar + mobile form)

## Context

The estimate name is the single value `formData.estimateName` (owned by `App.tsx`). Today it is editable via a Carbon `TextInput` labelled "Estimate name" at the top of the config form (`src/components/ConfigForm.tsx:231`), and the desktop `SummarySidebar` separately shows `formData.companyName` read-only as `.summary__title` (`src/components/SummarySidebar.tsx:107`).

The user wants one polished inline-edit affordance matching Figma **56:404** (serif name + 8px gap + a ghost pencil button; clicking turns the name itself into a seamless borderless input in **IBM Plex Serif**, saved by **Enter** or a **tick** button), applied in a responsive split:
- **Desktop:** the inline editor lives in the sidebar `.summary__title` (which becomes bound to `estimateName`). The top-of-form `TextInput` is **hidden**.
- **Mobile:** the sidebar title-block is already hidden (`src/index.css:1303`), so the inline editor **replaces the top-of-form `TextInput`** and is shown there instead.

Confirmed with the user: both locations edit the **same field, `estimateName`** (chosen over `companyName`), so desktop and mobile stay consistent. The mobile bottom-dock cue meta line keeps showing `companyName` unchanged.

Scope note: this spans `SummarySidebar`, `ConfigForm`, `App`, and `index.css`. The user approved wiring into `App` and reworking the top-of-form field. A small shared component avoids duplicating the edit logic in two places.

## Approach

### 1. NEW `src/components/InlineEditableName.tsx` — the shared inline editor
A small, presentational component reused by both callers so the edit logic isn't duplicated.
- Props: `value: string`, `onSave: (name: string) => void`, `placeholder?: string`, optional `label?: string` (Plex Sans eyebrow), `className?`.
- Local state: `editing` (bool), `draft` (string), input `ref`; `useEffect` on `editing` to focus + select the input.
- **read mode:** `<span className="inline-name__text">{value || placeholder}</span>` + icon-only ghost `IconButton` with the **`Edit` (pencil) icon** (16px, `label="Rename estimate"`) that seeds `draft = value` and sets `editing = true`.
- **edit mode:** `<input className="inline-name__input">` bound to `draft`, `onKeyDown` Enter → `save()`, Escape → cancel; plus an icon-only **`Checkmark`** ghost `IconButton` (`label="Save name"`) → `save()`.
- `save()` = `onSave(draft.trim())` (skip when blank) then `editing = false`.
- Imports: `IconButton` from `@carbon/react`; `Edit`, `Checkmark` from `@carbon/icons-react`.
- Reuses Carbon's `Edit` pencil icon — no need for the exported `f914a.svg` asset. IBM Plex Serif is already imported in `src/index.css`; no font resolution needed.

### 2. `src/components/SummarySidebar.tsx` — desktop title becomes the inline editor (bound to estimateName)
- Add props `estimateName: string` and `onRenameEstimate?: (name: string) => void`. Keep `customerName` for the mobile dock cue meta (unchanged).
- In `.summary__title-block`, replace the read-only `.summary__title` span (line 107) with `<InlineEditableName className="summary__title-edit" value={estimateName} placeholder="Untitled estimate" onSave={(n) => onRenameEstimate?.(n)} />`. Eyebrow "Configuration summary" stays above it.
- The mobile `.summary__dock` cue is untouched; `.summary__title-block` is already `display:none` ≤1056px, so this editor is desktop-only.

### 3. `src/components/ConfigForm.tsx` — replace the top TextInput; mobile-only
- Replace the `TextInput` at `ConfigForm.tsx:231` with a wrapper `<div className="estimator__form-name"><InlineEditableName label="Estimate name" value={formData.estimateName} placeholder="Untitled estimate" onSave={(n) => onChange('estimateName', n)} /></div>`.
- `.estimator__form-name` is hidden on desktop and shown ≤1056px (see CSS), so on desktop only the sidebar editor is used, and on mobile only the form editor is used.

### 4. `src/index.css` — shared inline-editor styling + responsive visibility, matching Figma 56:404
Input must be visually indistinguishable from the serif name (no box, no underline).
- `.inline-name` row: `display: flex; align-items: center; gap: 8px;`.
- `.inline-name__text` and `.inline-name__input` **both** render as the serif title: `font-family: 'IBM Plex Serif', serif; font-size: 1.75rem; line-height: 2.25rem; font-weight: 400; color: #161616;` with the text ellipsis-clamped; the input adds `background: transparent; border: none; outline: none; padding: 0; margin: 0; width: 100%;`.
- Optional `.inline-name__label` eyebrow: Plex Sans 16px/20px `#525252` (mirrors `.summary__eyebrow`) — used by the form caller for the "Estimate name" label.
- Ghost `IconButton`s need no bespoke CSS beyond the row gap.
- Responsive swap: base (desktop) `.estimator__form-name { display: none; }`; inside the existing `@media (max-width: 1056px)` block add `.estimator__form-name { display: block; }`. The sidebar editor is already desktop-only via `.summary__title-block` display rules.

### 5. `src/App.tsx` — wire the shared field
- Pass `estimateName={formData.estimateName}` and `onRenameEstimate={(name) => handleChange('estimateName', name)}` to `SummarySidebar` in **both** the form and review branches (reuses `handleChange` at `src/App.tsx:65`). `result` and all name displays update live via the existing `useMemo`.

## Critical files
- `src/components/InlineEditableName.tsx` — NEW shared inline editor (serif text + pencil ↔ borderless serif input + tick).
- `src/components/SummarySidebar.tsx` — `estimateName`/`onRenameEstimate` props; title-block uses `InlineEditableName` (desktop).
- `src/components/ConfigForm.tsx` — replace the top `TextInput` with `InlineEditableName` in `.estimator__form-name` (mobile).
- `src/index.css` — `.inline-name*` styling; `.estimator__form-name` responsive show/hide (desktop hidden, ≤1056px shown).
- `src/App.tsx` — pass `estimateName` + `onRenameEstimate` (both `SummarySidebar` usages), wired to `handleChange('estimateName', …)`.

## Verification
- Dev server already running; open the preview.
- **Desktop (≥1056px):** the top-of-form "Estimate name" field is gone; the sidebar title shows the estimate name with a pencil. Click it → seamless IBM Plex Serif inline input (current name selected); type + **Enter** or the **tick** → title updates. The change is reflected everywhere the estimate name is shown.
- **Mobile (≤1056px):** the sidebar title-block stays hidden; the top of the form shows the same serif name + pencil (no Carbon TextInput). Edit + save updates `estimateName`.
- Confirm both locations edit the same value: renaming on desktop then resizing to mobile shows the same name at the top of the form, and vice-versa.
- Blank input + save leaves the name unchanged / falls back to "Untitled estimate".
- Confirm no visual regression to the mobile bottom-dock cue (still shows `companyName` in the meta line).

---

# Round 7 — Swap desktop column positions (nav left, summary right)

## Context

On desktop the estimator body reads left→right as **SummarySidebar (400px) · ConfigForm · StepNav (200px)** — the summary/chart panel sits on the far left and the step navigation on the far right. The user wants to flip the outer columns so the layout reads **StepNav (left) · ConfigForm (center) · SummarySidebar (right)**: the step nav moves to the left of the main content, and the summary panel docks to the right edge of the screen. This is a desktop-only visual reordering — pricing, data, and the mobile layout (which already overrides everything below 1056px with fixed/sticky docks) stay exactly as they are.

Today's structure (`src/App.tsx`, both the form and review branches):
```
.estimator__body (flex row)
  <SummarySidebar/>          → .summary  (flex:0 0 400px, sticky, left)
  <main .estimator__main>    (flex row)
    <ConfigForm/>            → .estimator__form (flex:1)
    <StepNav/>               → .stepnav (flex:0 0 200px, right)   [form branch only]
```
`.stepnav`'s active-step indicator rail (`.stepnav__item::before`) currently sits on its **left** edge (adjacent to the form). `.estimator__form` has a `border-left: 1px solid #c6c6c6` that today separates it from the summary on its left.

## Approach

### 1. `src/App.tsx` — reorder the DOM in both branches
- **Form branch (`~line 241`):** render `<StepNav>` **before** `<ConfigForm>` inside `.estimator__main`, and move `<SummarySidebar>` to be the **last** child of `.estimator__body` (after `</main>`). Result: `.estimator__body` = `[main[ StepNav · ConfigForm ]] · Summary`.
- **Review branch (`~line 277`):** move `<SummarySidebar>` to after `.estimator__main` so the summary is on the right there too (no StepNav in review). Result: `main[ ReviewPage ] · Summary`.
- No prop changes; purely reordering existing elements.

Rationale for DOM reorder over CSS `order`: the mobile media block already positions `.summary` (fixed bottom dock) and `.stepnav` (sticky top tabs, `order:-1`) independently of source order, so reordering the desktop DOM is safe and keeps the desktop flow honest without adding `order` hacks that could interact with the existing mobile `order` rules.

### 2. `src/index.css` — mirror the step-nav and fix the divider side
Because the nav moves from the right edge to the left edge, mirror its internal treatment so the active rail stays adjacent to the main content and the outer padding faces the screen edge:
- `.stepnav` (`~line 775`): change `padding: 16px 16px 16px 0` → `padding: 16px 0 16px 16px` (gap now on the screen-left side, flush against the form on the right).
- `.stepnav__item::before` (`~line 806`): move the indicator rail from the left edge to the **right** edge (`left: auto; right: 0;`) so it sits between the labels and the ConfigForm, preserving today's "rail hugs the content" relationship.
- `.estimator__form` (`~line 99`): the `border-left` now separates the form from the StepNav on its left — still correct, so keep it. The form/summary boundary on the right needs no divider (the summary has its own `#f4f4f4` fill). Optionally add `border-left: 1px solid #c6c6c6` context is already satisfied; no change required there.
- Leave the comment on `.estimator__main` (`/* configform + right stepnav */`) updated to reflect nav-on-left.
- **Do not touch** the `@media (max-width: 1056px)` blocks: mobile stepnav tabs (bottom rail, `order:-1`) and the fixed summary dock must stay as-is. The desktop `::before` right-edge change is overridden inside the mobile block already (it re-sets `left/bottom/width/height`), so mobile tabs are unaffected — verify this override still fully specifies the rail position.

## Critical files
- `src/App.tsx` — reorder `<StepNav>`/`<ConfigForm>`/`<SummarySidebar>` in the form and review branches.
- `src/index.css` — `.stepnav` padding, `.stepnav__item::before` rail edge (left→right); confirm mobile media overrides still pin the rail correctly.

## Verification
- Dev server already running; open the preview at desktop width (≥1056px).
- **Form view:** confirm left→right order is now StepNav · ConfigForm · SummarySidebar; the summary/chart panel is flush to the right edge, the step rail sits on the nav's inner (right) edge adjacent to the form, and clicking steps still scroll-spies correctly.
- **Review view:** confirm the SummarySidebar is on the right and the review detail fills the rest.
- **Mobile (≤1056px):** unchanged — step tabs remain a sticky horizontal row at the top with a bottom active underline, and the summary remains the fixed bottom dock above the footer; no horizontal overflow.

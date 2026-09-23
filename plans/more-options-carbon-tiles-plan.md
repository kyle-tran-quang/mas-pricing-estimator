# Plan: Convert "More Options" Items to Carbon SelectableTile Components

## Overview
Migrate all items under the "More Options" panels across both **Step 1** (Industry Solutions, Essentials Packages) and **Step 3** (Core Applications, Industry Applications, Specialized Applications, Manage Add-ons, Advanced Components) from custom flex-based `ChecklistItem` rows to standard IBM Carbon Design System `SelectableTile` components. This ensures consistent design tokens, keyboard accessibility, focus states, and visual harmony across the entire configurator.

---

## Sub-Tasks

### Sub-Task 1: Design & Refactor Tile Component for "More Options"
- **Intent**: Replace the custom `ChecklistItem` container in `ConfigForm.tsx` with a clean `SelectableTile` component wrapper (or directly parameterized `SelectableTile`) that renders title, description, badge/tag metadata, and AppPoints pills cleanly using Carbon design tokens.
- **Expected Outcomes**:
  - `SelectableTile` is utilized for multi-selection with standard Carbon checkmark/selection indicator.
  - Proper typographic hierarchy (`IBM Plex Sans`, bold titles, secondary descriptions, Carbon `Tag` / badge styling).
  - Clean layout inside `.checklist-grid-4` (or updated `.tile-grid`) supporting 3 columns.
- **Todo List**:
  1. Inspect Carbon `SelectableTile` API props (`selected`, `onChange`/`onClick`, `id`, `value`, `className`, `children`).
  2. Implement a reusable Carbon `MoreOptionsTile` component in `src/components/ConfigForm.tsx` or refactor `ChecklistItem` to render `SelectableTile`.
  3. Ensure accessible label handling and consistent tag/pill positioning (e.g., Tag for Addon/Connector, AppPoints pill or Tag for AppPoints values).
- **Relevant Context**:
  - `src/components/ConfigForm.tsx:145-176` (Existing `ChecklistItem` component)
  - `src/components/ConfigForm.tsx:345-370` (Existing Step 3 `SelectableTile` pattern)
- **Status**: `[ ] pending`

---

### Sub-Task 2: Refactor Step 3 "More Options" Sections
- **Intent**: Convert all 5 subsections in Step 3 to use the new Carbon `SelectableTile` pattern with exact state bindings.
- **Expected Outcomes**:
  - **Core Applications**: Bound to `formData.selectedApplications` via `onToggleApplication` (syncs seamlessly with main grid).
  - **Industry Applications**: Bound to `selectedIndustryApps` state.
  - **Specialized Applications**: Bound to `selectedSpecializedApps` state.
  - **Manage Add-ons**: Bound to `selectedAddons` state with "Addon" or "Connector" tags and 100 AppPoints.
  - **Advanced Components**: Bound to `selectedAdvanced` state with 900 / 300 AppPoints.
- **Todo List**:
  1. Replace `ChecklistItem` calls in Step 3's 5 subsections with the `SelectableTile` implementation.
  2. Verify selection toggle handlers work correctly without double-triggering events.
  3. Verify AppPoints summation tags in the header still calculate accurately.
- **Relevant Context**:
  - `src/components/ConfigForm.tsx:389-493`
- **Status**: `[ ] pending`

---

### Sub-Task 3: Refactor Step 1 "More Options" Sections
- **Intent**: Convert Step 1's optional Industry Solutions and Essentials Edition Packages to use the Carbon `SelectableTile` pattern.
- **Expected Outcomes**:
  - **Industry Solutions**: Multi-select `SelectableTile` bound to `selectedSolutions`.
  - **Essentials Edition Packages**: Multi-select `SelectableTile` bound to `selectedPackages` with 50 AppPoints tag.
- **Todo List**:
  1. Replace `ChecklistItem` calls in Step 1's 2 subsections (`INDUSTRY_SOLUTIONS`, `ESSENTIALS_PACKAGES`) with `SelectableTile`.
  2. Verify layout and responsive behavior in Step 1 accordion.
- **Relevant Context**:
  - `src/components/ConfigForm.tsx:285-316`
- **Status**: `[ ] pending`

---

### Sub-Task 4: Update CSS Styles & Clean up Obsolete Rules
- **Intent**: Clean up CSS rules in `src/index.css` that were specific to the custom `.checklist-item` left-border styling and ensure Carbon `SelectableTile` within `.checklist-grid-4` renders with appropriate min-height, padding, and gap spacing.
- **Expected Outcomes**:
  - No broken CSS or unneeded `.checklist-item` classes.
  - Consistent grid tile height, flex-column alignment, and overflow handling.
- **Todo List**:
  1. Update `src/index.css` around lines 1154-1272 to style tiles and tags within `.checklist-grid-4` cleanly using Carbon tokens (`$background`, `$text-primary`, `$text-secondary`).
  2. Verify tile hover, focus-visible, and selected states match Carbon guidelines.
- **Relevant Context**:
  - `src/index.css:1154-1275`
- **Status**: `[ ] pending`

---

### Sub-Task 5: Testing, Build Verification & Git Commit
- **Intent**: Verify build, check for any runtime console errors or type issues, and deploy to GitHub Pages.
- **Expected Outcomes**:
  - `npm run build` runs cleanly with zero warnings/errors.
  - All tiles are interactive, responsive, and render appropriately in both light and Carbon theme modes.
  - Changes pushed to repository `main` branch.
- **Todo List**:
  1. Run `npm run build` to validate TypeScript and Vite bundle.
  2. Commit changes with clear descriptive message.
  3. Push to `main` branch and verify GitHub Pages workflow.
- **Relevant Context**:
  - `package.json`
  - `.github/workflows/deploy.yml`
- **Status**: `[ ] pending`

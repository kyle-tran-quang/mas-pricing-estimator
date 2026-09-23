# IBM Maximo Application Suite (MAS) Pricing Estimator Prototype

An interactive web application and prototype designed to configure and estimate **IBM Maximo Application Suite (MAS) AppPoints** and overall licensing costs. Built with React 19, TypeScript, Carbon Design System, and Tailwind CSS.

---

## 🌟 Key Features

### 1. ⚙️ Interactive Configuration Wizard (`ConfigForm`)
- **Step 1: Industry & Preset Solutions**
  - Select target industry (Aviation, Energy & Utilities, Oil & Gas, Transportation, Civil Infrastructure, Manufacturing, etc.).
  - Explore specialized industry solutions and essentials packages.
- **Step 2: Deployment & Environment Sizing**
  - Choose between SaaS and On-Premises deployment models.
  - Sizing tiers: Small, Medium, Large, Enterprise with dynamic base infrastructure points.
- **Step 3: Solutions & Core Applications**
  - Multi-select core MAS applications (Manage, Health, Predict, Monitor, Visual Inspection, Collaborate).
  - Add-ons (Asset Configuration Manager, Asset Investment Planning, Mobile, Spatial, Optimizers, SAP/Oracle Connectors).
  - Advanced components (Event Data Repository, Java Extensions) and database configuration (Db2, Oracle, SQL Server).
- **Step 4: User Mix & Licensing Tier Breakdown**
  - Concurrent and Authorized user counts across 4 tiers: **Premium**, **Base**, **Limited**, and **Self-Service**.
  - Dynamic user AppPoints subtotal calculations with visual breakdown.
- **Step 5: Contract Terms & Multi-Year Discounts**
  - 1-Year (Standard), 3-Year (12% discount), and 5-Year (20% discount).

### 2. 📊 Real-Time Dynamic Summary & Visualization (`SummarySidebar`)
- Live calculation of **Total AppPoints**, **Annual Cost**, and **Monthly Breakdown**.
- Proportional segmented cost bar chart visualizing AppPoints allocation across applications, environment size, dedicated architecture, and user tiers.
- Inline rename capabilities for deal/estimate titles.

### 3. 🤖 AI-Powered watsonx Estimator Assistant (`ChatPanel`)
- Interactive assistant powered by simulated watsonx reasoning.
- Natural language quote building (e.g., *"Configure for a mid-size transit agency with 50 base users"*).
- Direct application of AI-generated configurations to the active form.

### 4. 📋 Review & Export / CPQ Handoff (`ReviewPage` & `CpqTearsheet`)
- Comprehensive summary breakdown tables for all selected modules, user distributions, and pricing models.
- **CPQ Integration Tearsheet**: Generate and review structured CPQ payloads ready for opportunity linking and quote submission.

---

## 🛠 Tech Stack & Architecture

- **Framework**: React 19 + TypeScript
- **Bundler & Build Tool**: Vite 8
- **Design System & Components**: [IBM Carbon Design System](https://carbondesignsystem.com/) (`@carbon/react`, `@carbon/icons-react`, `@carbon/styles`)
- **Styling**: Tailwind CSS v4 + Carbon SCSS / Theme tokens (`Theme: g10`)
- **Formatting**: `oxfmt`

---

## 📁 Project Structure

```
├── .figma/                  # Figma Make configuration & site metadata
├── public/assets/           # SVG icons, pictograms, and visual assets
├── src/
│   ├── components/
│   │   ├── AppShell.tsx            # Header shell, navigation, and AI assistant trigger
│   │   ├── ChatPanel.tsx           # watsonx conversational assistant panel
│   │   ├── chatResponder.ts        # Intent parser & simulated assistant replies
│   │   ├── quoteBuilder.ts         # Quote generation logic from natural language
│   │   ├── ConfigForm.tsx          # Multi-step pricing & sizing configuration form
│   │   ├── InlineEditableName.tsx  # In-place editable deal/estimate title
│   │   ├── StepNav.tsx             # Interactive horizontal step navigation
│   │   ├── SummarySidebar.tsx      # Sticky sidebar with live AppPoints & pricing viz
│   │   ├── ReviewPage.tsx          # Final review & line-item breakdown view
│   │   └── CpqTearsheet.tsx        # CPQ opportunity push modal / tearsheet
│   ├── imports/
│   │   ├── calculateEstimate.js    # Core AppPoints & pricing calculation engine
│   │   ├── calculateEstimate.d.ts  # Type definitions for the calculation engine
│   │   └── constants.js            # MAS application pricing tiers & defaults
│   ├── App.tsx                     # Main application controller & state management
│   ├── index.css                   # Global styles & Tailwind v4 imports
│   ├── main.tsx                    # Application entrypoint
│   └── types.ts                    # Global TypeScript interfaces
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+ recommended, v20+ supported)
- npm, pnpm, or yarn

### Installation & Run

1. **Clone the repository:**
   ```bash
   git clone https://github.com/kyle-tran-quang/mas-pricing-estimator.git
   cd mas-pricing-estimator
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```

4. **Open the browser:**
   Navigate to [http://localhost:5173](http://localhost:5173).

---

## 📜 Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Starts the Vite dev server with Hot Module Replacement (HMR) |
| `npm run build` | Bundles TypeScript and assets into production build in `dist/` |
| `npm run preview` | Locally serves the production build |
| `npm run format` | Runs `oxfmt` code formatter |

# 🚀 iSTARTUP Score — Startup Readiness Benchmark

A unified, AI-powered benchmarking platform designed to evaluate early-stage startups on **Feasibility**, **Market Viability**, and **Execution Readiness**. 

`iSTARTUP Score` measures your intellectual property, team capability, business model strength, and market momentum to deliver an actionable, fundability report for venture capital, incubators (e.g. Plug and Play), and non-dilutive grant agencies.

---

## 🌟 Key Features

- **⚡ Interactive AI Interview**: Dynamic chat-driven evaluation powered by **Google Genkit** and **Gemini 2.5 Flash**.
- **📊 5-Vector Score Breakdown**:
  - 👤 **Management** (Team capability, advisory strength, operational experience)
  - 🚀 **Momentum** (Traction, milestones, customer growth, product velocity)
  - 💼 **Business Model** (Pricing, unit economics, revenue defensibility, scalable IP)
  - 🔥 **Motivation** (Founder vision, market urgency, problem-solution alignment)
  - 🎯 **Market** (TAM/SAM/SOM size, competitive positioning, barrier to entry)
- **📜 Comprehensive Benchmark Report**: Generates structured markdown analysis, weighted category scores, and growth recommendations.
- **📄 Instant PDF Export**: High-fidelity PDF report generation for investors and grant applications (`jspdf` + `html2canvas`).
- **🎨 Glassmorphic Premium Design System**: Dark theme styled with custom gradients, smooth micro-animations (`framer-motion`), and Tailwind CSS v4.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Next.js 16 (App Router)](https://nextjs.org/) + React 19 |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **AI Orchestration** | [Google Genkit](https://firebase.google.com/docs/genkit) + `@genkit-ai/google-genai` |
| **AI Model** | Google Gemini 2.5 Flash |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) + Custom Glassmorphism CSS |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) |
| **Validation** | [Zod](https://zod.dev/) |
| **PDF Generation** | `jspdf` & `html2canvas` |
| **Analytics** | [@vercel/analytics](https://vercel.com/analytics) |
| **Icons** | [Lucide React](https://lucide.dev/) |

---

## 📁 Project Structure

```text
istartup-standalone/
├── public/                  # Static assets & fallbacks
├── src/
│   ├── ai/                  # Genkit configuration & Google AI initialization
│   ├── app/                 # Next.js App Router (Layout, Page, Metadata, Icons)
│   ├── components/          # Shared UI primitives (Radix UI, buttons, toasts)
│   ├── firebase.ts          # Firebase client configuration
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility functions & class names merger
│   └── modules/
│       └── istartup-score/  # Core Domain Module
│           ├── ai/          # Assessment rules, config JSON, & AI scoring flow
│           ├── app/         # Landing page & Interview evaluation pages
│           └── components/  # AI Chat interface & scoring report renderer
├── package.json
└── tsconfig.json
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- `npm` / `yarn` / `pnpm` / `bun`
- Google Gemini API Key

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ScienceWerx-Inc/I-Startup.git
   cd istartup-standalone
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env.local` file in the project root:
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key_here
   ```

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to explore the landing page and start an evaluation interview at `/interview`.

---

## 📦 Scripts

- `npm run dev`: Starts the Next.js dev server with Turbopack.
- `npm run build`: Compiles and builds the production application.
- `npm run start`: Starts the Next.js production server.
- `npm run lint`: Runs ESLint for code quality checks.

---

## 📄 License

Private & Confidential — ScienceWerx Inc. / iSTARTUP. All rights reserved.

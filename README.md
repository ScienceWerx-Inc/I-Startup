# 🚀 iSTARTUP Score — Startup Readiness Benchmark

A unified, AI-powered benchmarking platform designed to evaluate early-stage startups on **Feasibility**, **Market Viability**, and **Execution Readiness**. 

`iSTARTUP Score` measures your intellectual property, team capability, business model strength, and market momentum to deliver an actionable, fundability report for venture capital, incubators (e.g. Plug and Play), and non-dilutive grant agencies.

---

## 🌟 Key Features

- **🧭 Structured Assessment (FounderFit-style)**: Intro → startup profile → five sections, each with its own brief → one question per screen → review → report. Every question offers **five written answer anchors** instead of a bare 1–5 rating, with a clickable progress track, Back/Review navigation, keyboard shortcuts (1–5, ←/→), and progress saved on the device so founders can resume.
- **📊 5-Vector Score Breakdown** (weight in final score):
  - 👤 **Management** — 20% (team track record, coachability, advisors, capital stewardship, growth vision)
  - 🚀 **Momentum** — 25% (traction, adoption pace, ecosystem, external validation, measurable growth)
  - 💼 **Business Model** — 20% (revenue model, scalability, industry insight, value proposition, profitability)
  - 🔥 **Motivation** — 15% (market timing, team–product fit, urgency, IP protection, concept validation)
  - 🎯 **Market** — 20% (market size, growth, customer pain, differentiation, trend alignment)
- **📜 Readiness Report**: A score out of 500 with a readiness band, per-dimension bars, key strengths, critical gaps, and priority actions ranked by the points each would recover, plus a full response appendix.
- **📄 PDF Export**: Print-optimised report layout (`window.print()` → Save as PDF).
- **🎨 Professional Design System**: A restrained light "research instrument" identity (IBM Plex, navy ink, iSTARTUP blue) shared by the landing page, assessment, and report.

The question bank lives in `src/modules/istartup-score/assessment/bank.ts` and scoring in `assessment/scoring.ts` (pure, deterministic functions).

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
│           ├── assessment/  # Question bank & deterministic scoring
│           ├── app/         # Landing page & assessment page
│           └── components/  # Assessment shell, report view & shared chrome
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

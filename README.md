# CodeAtlas - AI Developer Platform

CodeAtlas helps developers understand unfamiliar GitHub repositories faster. Paste a repository URL and CodeAtlas turns real repository data into architecture views, dependency graphs, blast-radius analysis, security findings, debugging context, implementation plans, onboarding guidance, chat, and exportable documentation.

The product is built for developers who need to answer the practical questions that come up before changing code:

- What does this project do?
- Where should I start reading?
- Which files are risky to change?
- What depends on this file?
- What is the likely impact of a change?
- Where could this bug come from?
- What security issues are visible from the repo?
- How can I turn a ticket into an implementation plan?

## Table of Contents

- [Why CodeAtlas](#why-codeatlas)
- [Core Features](#core-features)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [API Routes](#api-routes)
- [Security And Privacy](#security-and-privacy)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)
- [Roadmap](#roadmap)
- [Screenshots And Demo](#screenshots-and-demo)

## Why CodeAtlas

Most repository tools show files, folders, or generic summaries. CodeAtlas is designed as a developer intelligence workspace: it combines deterministic repository analysis with optional AI explanations so the user can inspect evidence, navigate relationships, and make safer engineering decisions.

CodeAtlas is especially useful for:

- onboarding into an unfamiliar codebase
- planning feature work or refactors
- debugging stack traces across files
- reviewing risky files before changing them
- understanding architecture at multiple levels
- preparing hackathon or stakeholder demos
- generating repository documentation and PDF reports

## Core Features

### Dashboard

The first analyzed-repository view. It summarizes repository health, size, detected technologies, key files, and navigation paths into deeper tools.

### Summary

Generates a concise repository overview, quick-start guidance, common issues, and first contribution ideas from the analyzed repository context.

### Architecture V2

High-level software architecture workspace with six views:

- Overview
- System Context
- Containers
- Modules
- Runtime Flow
- Tech Stack

Architecture V2 focuses on system understanding, not raw file dependency exploration.

### Repository Graph

Graph-backed dependency navigation for repository files. It uses a focused relationship map, search, selection, file inspector, graph-backed/fallback indicators, and React Flow controls.

### Blast Radius

Impact analysis for a selected file or change area. It identifies dependent files, imported files, related modules, traversal depth, and risk signals so developers can understand what may break.

### AI Engineering Change Planner

Turns a feature request, bug report, migration, or refactor goal into a repo-aware implementation plan. Planner is deterministic-first and can optionally enhance the plan with AI.

Planner can show:

- likely intent
- matched files
- affected systems
- suggested files
- implementation roadmap
- risks
- validation checklist
- blast impact context

### Debug Trace Navigator

Parses stack traces, browser console errors, API errors, or bug descriptions and builds a probable local debugging path.

Debug Navigator can extract:

- error type and message
- stack frames
- file paths
- line and column numbers
- API routes
- URLs and HTTP status codes
- matched repository files
- dependency-aware upstream/downstream context
- likely root-cause candidates
- suggested inspection order

### Danger Zone Heatmap

Ranks risky files and modules using deterministic repository signals. It summarizes risk concentration instead of duplicating the Repository Graph or Blast Radius pages.

Risk scoring can use:

- blast radius / impact
- dependency centrality
- security findings
- file size and complexity signals
- path sensitivity
- graph-backed coverage

### Security Scanner

Deterministic-first security scanner with optional AI explanation. AI can summarize and prioritize detected findings, but deterministic findings remain the source of truth.

Current scanner capabilities include:

- source-code security rules
- secret scanning with redaction
- dependency vulnerability checks through OSV when exact versions are available
- config and supply-chain posture checks
- SARIF-style metadata
- CycloneDX-style SBOM export
- external SARIF import for tools such as CodeQL, Semgrep, or Trivy

### Onboarding Guide

Repository-aware onboarding workspace for new contributors. It uses repo metadata, architecture context, code analysis, quick-start content, common issues, and contribution suggestions.

### Documentation

Generated documentation and repository reference material based on analyzed files and metadata.

### CodeAtlas Chat

Repository-aware chat assistant. It builds compact context from the analyzed repository and can answer setup, architecture, security, debugging, and explanation questions.

### Download PDF Report

Exports an analyzed repository report as a PDF, including repository summary, architecture context, onboarding content, key diagrams, and analysis sections.

## How It Works

1. Enter a GitHub repository URL.
2. CodeAtlas calls the GitHub analysis API and builds repository metadata, file lists, important files, package information, and dependency graph signals.
3. Code analysis extracts definitions, patterns, security hints, file metadata, and graph context.
4. Deterministic tools generate evidence-backed graph, risk, debug, security, planner, heatmap, and blast-radius outputs.
5. Optional AI endpoints enhance summaries, plans, explanations, and chat responses using Groq/Gemini provider routing.
6. The user explores the workspace and can export Markdown, SARIF, SBOM, or PDF reports depending on the feature.

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | React 18, Create React App |
| UI | Custom dark CodeAtlas UI, Lucide icons |
| Graphs | React Flow, ELK, Dagre |
| Backend APIs | Vercel serverless functions |
| Repository data | GitHub API |
| AI providers | Groq and Gemini with fallback routing |
| Security data | Local deterministic scanner, OSV API, SARIF import/export |
| PDF/export | jsPDF, html2pdf.js, html-to-image |
| Markdown/rendering | marked, DOMPurify |

## Local Setup

### Prerequisites

- Node.js
- npm
- GitHub personal access token
- Optional Groq and/or Gemini API key for AI-enhanced features

### Install dependencies

```bash
npm install
```

### Run locally with API routes

Use Vercel dev for the full app because repository analysis and AI/security routes live under `/api`.

```bash
npx vercel dev
```

Then open:

```text
http://localhost:3000
```

### UI-only fallback

```bash
npm start
```

This starts the React UI, but repository analysis routes may not work without Vercel dev.

### Build

```bash
npm run build
```

## Environment Variables

Create a local `.env` file from `.env.example`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `GITHUB_TOKEN` | Yes | GitHub personal access token used by `/api/github/analyze` |
| `GROQ_API_KEY` | Optional but recommended | Enables Groq AI provider |
| `GEMINI_API_KEY` | Optional but recommended | Enables Gemini AI provider |
| `DEFAULT_AI_PROVIDER` | Optional | Primary provider, usually `groq` |
| `FALLBACK_AI_PROVIDER` | Optional | Fallback provider, usually `gemini` |

At least one AI provider key is needed for AI-enhanced summaries, chat, planner, debug explanations, and security explanations. Deterministic features still work without AI where local data is available.

Never commit `.env`, API keys, tokens, cookies, or credentials.

## API Routes

| Route | Purpose |
| --- | --- |
| `/api/github/analyze` | Fetches and analyzes GitHub repository data |
| `/api/chat` | Repository-aware chat endpoint |
| `/api/ai/summary` | AI repository summary |
| `/api/ai/quickstart` | AI quick-start guidance |
| `/api/ai/common-issues` | AI common issue generation |
| `/api/ai/contributions` | AI first contribution suggestions |
| `/api/ai/planner` | Optional AI enhancement for deterministic Planner output |
| `/api/ai/debug-navigator` | Optional AI enhancement for deterministic debug context |
| `/api/ai/security` | Optional AI explanation for deterministic security findings |
| `/api/ai/blast-radius` | Optional AI blast-radius reasoning |
| `/api/security/scan` | Bounded deterministic security file scan |
| `/api/security/dependencies` | Dependency vulnerability lookup through OSV when possible |

## Security And Privacy

CodeAtlas is designed to keep evidence and uncertainty visible.

- Security Scanner is deterministic-first.
- AI is explanation-only for security findings and must not invent new issues.
- Secret-like values are redacted before display, export, cache, or AI payload use.
- Dependency vulnerability results are only shown when backed by manifest/OSV data.
- Missing data is labeled as partial or unavailable instead of being filled with fake results.
- Environment variables belong in local `.env` or Vercel project settings, never in source code.

## Project Structure

```text
api/                         Vercel serverless API routes
src/components/              React UI components
src/components/pages/        Main workspace pages
src/components/TabContent/   Analysis tabs and feature surfaces
src/services/                GitHub, AI, code analysis, and PDF services
src/services/ai/             Groq/Gemini provider router
src/utils/repository/        Graph, planner, debug, heatmap, and repo utilities
src/utils/security/          Deterministic security scanner
src/styles/                  App design system and component styles
architecture_docs/           Existing architecture documentation
```

## Testing

Run the test suite:

```bash
npm test -- --watchAll=false
```

Run a production build check:

```bash
npm run build
```

Useful manual verification:

1. Start the app with `npx vercel dev`.
2. Analyze a public GitHub repository.
3. Open Dashboard, Architecture V2, Repository Graph, Blast Radius, Planner, Debug Navigator, Heatmap, Security Scanner, Onboarding Guide, Documentation, and Chat.
4. Confirm deterministic views render before optional AI enhancements.
5. Export a PDF report from the top bar.

## Deployment

CodeAtlas is configured for Vercel.

Set these environment variables in Vercel Project Settings:

- `GITHUB_TOKEN`
- `GROQ_API_KEY` and/or `GEMINI_API_KEY`
- `DEFAULT_AI_PROVIDER`
- `FALLBACK_AI_PROVIDER`

The repository includes `vercel.json` with Create React App build settings and API route handling.

## Contributing

This project is still moving quickly, so keep contributions small, focused, and easy to review.

Recommended workflow:

1. Create a feature branch or worktree.
2. Make one focused change.
3. Run the smallest relevant verification, usually `npm run build` or `npm test -- --watchAll=false`.
4. Do not commit `.env`, secrets, `.DS_Store`, generated build output, or unrelated local files.
5. Use a clear commit message such as `feat: improve repository graph controls` or `fix: handle empty security scan state`.

## License

No `LICENSE` file is currently committed. Add one before treating this as a reusable open-source package or production template.

## Roadmap

- More saved workspace/session workflows
- Richer selected-file handoff between Repository Graph, Blast Radius, Planner, Heatmap, and Security Scanner
- Expanded external scanner imports for SARIF-compatible tools
- Deeper language ecosystem support for dependency vulnerability scanning
- More onboarding-guide personalization
- More robust PDF and report templates

## Screenshots And Demo

No current app screenshots are committed in the repository. Add real screenshots or a demo video here once the latest UI is captured.

Recommended screenshots:

- Home page repository analyzer
- Dashboard after analysis
- Architecture V2
- Repository Graph
- Security Scanner
- Debug Navigator
- Danger Zone Heatmap
- PDF report preview

## Credits

Built as CodeAtlas, an AI developer platform for understanding systems and predicting change impact.

Originally developed during the IBM Bob DevDay Hack-26 project cycle.

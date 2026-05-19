# DevDock - AI-Powered Developer Onboarding

AI-powered platform for analyzing GitHub repositories and generating comprehensive developer documentation.

## Latest Changes

### May 6, 2026
- **Watsonx Configuration Update**: Migrated to new Watsonx project (DevDock-02)
- Updated Project ID: `170f23bd-636f-4d6a-93a9-d80dffb9a02c`
- Fixed inactive WML instance error by creating fresh Watsonx project

### May 5, 2026
- Remove rocket icon from Analyze Repository buttons
- Remove impact stats from ImpactComparison section
- Make hero footer impact stats smaller and subtle
- Update hero footer styling
- Replace trust indicators with impact stats

## Features

- 🤖 AI-powered code analysis using IBM Watsonx
- 📊 Dynamic architecture diagrams
- 🔒 Security scanning
- 💬 Interactive chat for repository questions
- 📄 PDF documentation generation
- 🎯 Onboarding guides for new developers

## Tech Stack

- React.js
- IBM Watsonx AI (Granite models)
- GitHub API
- Vercel (Deployment)

## Environment Variables

Required in `.env` at the project root (see `.env.example`):
- `GITHUB_TOKEN` — GitHub personal access token (used by `/api/github/analyze`)
- `WATSONX_API_KEY`, `WATSONX_PROJECT_ID`, `WATSONX_REGION_URL`, `WATSONX_MODEL_ID` — for Chat (Watsonx)

## Getting Started

```bash
npm install
```

**Local development (UI + API routes):**

```bash
vercel dev
```

Then open `http://localhost:3000`. Use `vercel dev` instead of `npm start` alone so `/api/github/analyze` works.

**UI only (Analyze will not work):**

```bash
npm start
```

## Deployment

Deployed on Vercel. Make sure to set environment variables in Vercel project settings.

---

Built for IBM Bob DevDay Hack-26
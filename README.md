# DevDock V2 - Enhanced AI-Powered Developer Onboarding

> Built upon DevDock V1 with completely redesigned architecture, multi-LLM support, and enhanced capabilities.

## 🚀 What's New in V2

### Multi-LLM Support
- **IBM Watsonx.ai** - Granite models for enterprise-grade analysis
- **OpenAI GPT-4** - Advanced reasoning and code understanding
- **Anthropic Claude** - Long-context analysis and detailed explanations
- **Google Gemini** - Multimodal capabilities and fast responses

### Enhanced Features
- 🎨 **Modern UI/UX** - Redesigned interface with better user experience
- 📊 **Advanced Analytics** - Deeper insights into repository metrics
- 🔄 **Real-time Updates** - Live analysis progress and streaming responses
- 🎯 **Smart Recommendations** - AI-powered suggestions based on multiple models
- 🔐 **Enhanced Security** - Advanced vulnerability detection and compliance checks
- 💬 **Improved Chat** - Context-aware conversations with model selection
- 📈 **Performance Metrics** - Detailed performance tracking and optimization suggestions

## 🏗️ Architecture Improvements

### V1 → V2 Changes
- **State Management**: React Context → Zustand (better performance)
- **Routing**: Single page → React Router (better navigation)
- **API Layer**: Direct calls → Axios with interceptors (better error handling)
- **Component Structure**: Flat → Modular with hooks and contexts
- **Styling**: CSS → CSS Modules + Tailwind (optional)

## 📦 Tech Stack

### Frontend
- **Next.js** (App Router) + React 18
- Zustand, TanStack Query, React Flow, Tailwind-style utility classes

### Backend (canonical)
- **Express** API in `api/` (port **3001** by default)
- Prisma, BullMQ, Redis, Qdrant, LangChain, DeepSeek, Hugging Face embeddings

### Optional / legacy
- `server/` — older duplicate Express app (**not** started by `npm run dev:all`); use `npm run server:legacy` only if you intend to debug it.

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- npm
- PostgreSQL (e.g. Neon), Redis (e.g. Upstash), Qdrant, and API keys as listed in `api/.env.example`

### Installation

```bash
cd devdock

# Frontend + shared root deps
npm install

# API (workers start with the API process)
cd api && npm install && cd ..
```

### Environment

1. **Root** — `cp .env.example .env` and paste your real keys (Neon, Upstash, Qdrant, Hugging Face, DeepSeek, GitHub).
2. Run **`npm run env:sync`** — copies backend vars into `api/.env`.
3. The API also reads **root `.env` automatically** (`api/src/loadEnv.js`), so one file is enough.

Minimum for Next: `NEXT_PUBLIC_API_URL=http://localhost:3001` (already in `.env.example`).

### Running the application

```bash
# Recommended: Next (3000) + CodeAtlas API + workers (3001)
npm run dev:all
```

Or in two terminals:

```bash
npm run api:dev    # from repo root — runs api/server.js + workers
npm run dev        # Next.js
```

Open **http://localhost:3000**. API health: **http://localhost:3001/health**. Queue UI: **http://localhost:3001/admin/queues** (when enabled).

```bash
# Production-style
cd api && npm start   # API on PORT or 3001
npm run build && npm start   # Next
```

## 📁 Project Structure

```
devdock-v2/
├── src/
│   ├── components/          # React components
│   │   ├── common/         # Reusable components
│   │   ├── layout/         # Layout components
│   │   ├── features/       # Feature-specific components
│   │   └── pages/          # Page components
│   ├── services/           # API services
│   │   ├── llm/           # LLM integrations
│   │   ├── github/        # GitHub API
│   │   └── analytics/     # Analytics service
│   ├── hooks/             # Custom React hooks
│   ├── contexts/          # React contexts
│   ├── utils/             # Utility functions
│   ├── store/             # Zustand stores
│   └── App.jsx            # Main app component
├── api/                   # Backend API routes
│   ├── llm/              # LLM proxy endpoints
│   ├── github/           # GitHub proxy
│   └── analytics/        # Analytics endpoints
├── public/               # Static assets
└── package.json

```

## 🎯 Key Features

### 1. Multi-LLM Analysis
Choose which AI model to use for different tasks:
- **Code Analysis**: GPT-4 for deep understanding
- **Documentation**: Claude for detailed explanations
- **Quick Insights**: Gemini for fast responses
- **Enterprise**: Watsonx for compliance and security

### 2. Enhanced Repository Analysis
- Deeper code structure analysis
- Dependency graph visualization
- Performance bottleneck detection
- Code quality metrics
- Technical debt assessment

### 3. Advanced Security Scanning
- CVE database integration
- License compliance checking
- Secret detection
- Dependency vulnerability scanning
- Security best practices validation

### 4. Interactive Analytics Dashboard
- Repository health score
- Contribution patterns
- Code complexity trends
- Performance metrics
- Team productivity insights

### 5. Smart Onboarding
- Personalized learning paths
- Skill-based task recommendations
- Interactive tutorials
- Progress tracking
- Mentor matching suggestions

## 🔄 Migration from V1

This project builds upon DevDock V1 with:
- ✅ All V1 features preserved
- ✅ Enhanced with new capabilities
- ✅ Improved architecture and performance
- ✅ Better user experience
- ✅ More flexible and extensible

## 🤝 Contributing

This is a hackathon project. Contributions and suggestions are welcome!

## 📝 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Built upon DevDock V1
- Powered by IBM Watsonx.ai, OpenAI, Anthropic, and Google
- GitHub API for repository data
- Open source community

---

**Built for [Hackathon Name]**  
**Development Period**: [Start Date] - [End Date]  
**Version**: 2.0.0

---

Made with ❤️ using Bob IDE
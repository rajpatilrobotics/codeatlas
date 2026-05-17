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
- React 18.2.0
- React Router 6.22.0
- Zustand 4.5.0 (State Management)
- ReactFlow 11.11.4 (Diagrams)
- Recharts 2.12.0 (Analytics)
- Mermaid 11.14.0 (Diagram Generation)

### Backend
- Express 5.2.1
- Node.js 18+

### AI/LLM Integration
- IBM Watsonx.ai (Granite)
- OpenAI GPT-4
- Anthropic Claude
- Google Gemini

### External APIs
- GitHub REST API v3
- Multiple LLM providers

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- API keys for LLM providers (at least one)

### Installation

```bash
# Navigate to project
cd devdock-v2

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your API keys
# Add keys for the LLMs you want to use
```

### Environment Variables

```env
# IBM Watsonx (Required)
REACT_APP_WATSONX_API_KEY=your_key
REACT_APP_WATSONX_PROJECT_ID=your_project_id
REACT_APP_WATSONX_REGION_URL=https://us-south.ml.cloud.ibm.com

# OpenAI (Optional)
REACT_APP_OPENAI_API_KEY=your_key

# Anthropic Claude (Optional)
REACT_APP_ANTHROPIC_API_KEY=your_key

# Google Gemini (Optional)
REACT_APP_GEMINI_API_KEY=your_key

# GitHub
REACT_APP_GITHUB_TOKEN=your_token
```

### Running the Application

```bash
# Development mode (runs both frontend and backend)
npm run dev

# Or run separately:
# Terminal 1 - Frontend
npm start

# Terminal 2 - Backend
npm run server
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
# DevDock - AI-Powered Developer Onboarding Platform

## 🚀 Project Overview

**DevDock** is an intelligent developer onboarding platform that leverages IBM watsonx.ai to automatically analyze GitHub repositories and generate comprehensive documentation, architecture diagrams, and onboarding guides in minutes instead of hours.

### Key Features

- 🔍 **Automatic Repository Analysis** - Analyzes any GitHub repository instantly
- 🤖 **AI-Powered Insights** - Uses IBM watsonx.ai Granite model for intelligent summaries
- 📊 **Visual Architecture Diagrams** - Interactive data flow and component diagrams
- 📚 **Auto-Generated Documentation** - Quick start guides, setup instructions, and more
- 🔒 **Security Scanning** - Identifies vulnerabilities and best practices
- 💬 **Interactive AI Chat** - Ask questions about the repository
- 📄 **PDF Export** - Download comprehensive onboarding reports
- ⚡ **50+ Technology Detection** - Automatically identifies frameworks and tools

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Features](#features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## 🛠️ Installation

### Prerequisites

- **Node.js** 18.x or higher
- **npm** or **yarn**
- **IBM Cloud Account** (for watsonx.ai)
- **IBM watsonx.ai API Key**

### Step 1: Clone Repository

```bash
git clone https://github.com/yourusername/devdock.git
cd devdock
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

Required environment variables:

```bash
REACT_APP_WATSONX_API_KEY=your_api_key_here
REACT_APP_WATSONX_PROJECT_ID=your_project_id_here
REACT_APP_WATSONX_REGION_URL=https://us-south.ml.cloud.ibm.com
REACT_APP_WATSONX_MODEL_ID=ibm/granite-13b-chat-v2
PORT=5001
```

### Step 4: Get IBM watsonx.ai Credentials

1. Visit [IBM Cloud](https://cloud.ibm.com)
2. Create/login to your account
3. Navigate to watsonx.ai service
4. Create a project and copy the Project ID
5. Go to [IAM API Keys](https://cloud.ibm.com/iam/apikeys)
6. Create an API key and copy it
7. Add both to your `.env` file

## 🚀 Quick Start

### Development Mode

**Terminal 1 - Start Backend Server:**
```bash
node server.js
```

**Terminal 2 - Start React App:**
```bash
npm start
```

The application will open at `http://localhost:3000`

### Using DevDock

1. **Enter GitHub URL** - Paste any public GitHub repository URL
2. **Click Analyze** - Wait 30-60 seconds for analysis
3. **Explore Results** - Navigate through 6 tabs:
   - 📊 Summary - AI-generated overview
   - 🏗️ Architecture - Visual diagrams
   - 📚 Documentation - Setup guides
   - 🚀 Onboarding - First contribution suggestions
   - 🔒 Security - Vulnerability scan
   - 💬 Chat - Ask AI questions
4. **Download PDF** - Export comprehensive report

## ✨ Features

### 1. Repository Analysis

- **Automatic Detection** of 50+ technologies
- **File Structure Analysis** with priority ranking
- **Complexity Scoring** algorithm
- **Contributor Analysis** and commit activity
- **Environment Variable Detection**
- **Key Commands Extraction**

### 2. AI-Powered Generation

- **Repository Summary** - Concise overview with key insights
- **Quick Start Guide** - Step-by-step setup instructions
- **Architecture Analysis** - Pattern detection and structure
- **Common Issues** - Known problems and solutions
- **First Contributions** - Beginner-friendly tasks with hints

### 3. Visual Diagrams

- **Data Flow Diagrams** - Interactive ReactFlow visualizations
- **Component Architecture** - Hierarchical structure
- **Function Call Flows** - Code execution paths
- **File Structure** - Directory tree visualization

### 4. Security Scanning

- **Vulnerability Detection** - Hardcoded credentials, SQL injection risks
- **Best Practices Check** - Security recommendations
- **Dependency Analysis** - Outdated packages
- **Risk Assessment** - Severity ratings

### 5. Interactive Chat

- **Context-Aware Responses** - Understands repository context
- **Suggested Questions** - Common queries
- **Response Caching** - Instant answers for repeated questions
- **Markdown Formatting** - Code syntax highlighting

### 6. PDF Export

- **Comprehensive Report** - All analysis in one document
- **Professional Formatting** - Headers, sections, styling
- **Diagrams Included** - Visual representations
- **Shareable** - Perfect for team onboarding

## 🏗️ Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    DevDock System                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────┐ │
│  │   React      │───▶│   Express    │───▶│   IBM    │ │
│  │   Frontend   │    │   Backend    │    │ watsonx  │ │
│  │  (Port 3000) │    │  (Port 5001) │    │   .ai    │ │
│  └──────────────┘    └──────────────┘    └──────────┘ │
│         │                    │                   │      │
│         ▼                    ▼                   ▼      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────┐ │
│  │   GitHub     │    │   IBM IAM    │    │ Granite  │ │
│  │   API        │    │   Auth       │    │  Model   │ │
│  └──────────────┘    └──────────────┘    └──────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### System Components

**Frontend (React)**
- User interface and interactions
- Tab-based navigation
- Real-time updates
- PDF generation

**Backend (Express)**
- IBM IAM authentication
- Token caching
- API proxy
- CORS handling

**External Services**
- GitHub API - Repository data
- IBM watsonx.ai - AI generation
- IBM IAM - Authentication

For detailed architecture documentation, see [architecture_docs/](./architecture_docs/)

## 🔧 Technology Stack

### Frontend
- **React** 18.2.0 - UI framework
- **ReactFlow** 11.11.4 - Interactive diagrams
- **Mermaid** 11.14.0 - Diagram generation
- **html2pdf.js** 0.14.0 - PDF export
- **Dagre** 0.8.5 - Graph layout

### Backend
- **Express** 5.2.1 - Web server
- **node-fetch** 2.7.0 - HTTP client
- **cors** 2.8.6 - CORS middleware
- **dotenv** 17.4.2 - Environment config

### External APIs
- **GitHub REST API v3** - Repository data
- **IBM watsonx.ai** - AI text generation
- **IBM IAM** - Authentication

### Development Tools
- **react-scripts** 5.0.1 - Build tooling
- **http-proxy-middleware** 3.0.5 - API proxy

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `REACT_APP_WATSONX_API_KEY` | IBM Cloud API Key | Yes | - |
| `REACT_APP_WATSONX_PROJECT_ID` | watsonx.ai Project ID | Yes | - |
| `REACT_APP_WATSONX_REGION_URL` | watsonx.ai Region URL | Yes | us-south |
| `REACT_APP_WATSONX_MODEL_ID` | Model identifier | Yes | granite-13b-chat-v2 |
| `PORT` | Backend server port | No | 5001 |

### Available Regions

- **US South**: `https://us-south.ml.cloud.ibm.com`
- **EU Germany**: `https://eu-de.ml.cloud.ibm.com`
- **UK**: `https://eu-gb.ml.cloud.ibm.com`
- **Japan**: `https://jp-tok.ml.cloud.ibm.com`

### Available Models

- `ibm/granite-13b-chat-v2` (Recommended)
- `ibm/granite-13b-instruct-v2`
- `ibm/granite-20b-multilingual`

## 📖 Usage

### Basic Usage

```javascript
// 1. Enter GitHub URL
const repoUrl = "https://github.com/facebook/react";

// 2. Click "Analyze Repository"
// System performs:
// - Repository data fetching
// - Technology detection
// - Architecture analysis
// - AI summary generation

// 3. View Results in Tabs
// - Summary: Overview and insights
// - Architecture: Visual diagrams
// - Documentation: Setup guides
// - Onboarding: Contribution suggestions
// - Security: Vulnerability scan
// - Chat: Interactive Q&A

// 4. Download PDF
// Exports comprehensive report
```

### Advanced Features

**Custom Analysis**
```javascript
// Analyze specific aspects
const analysis = await analyzeRepository(url, {
  includeSecurity: true,
  includeArchitecture: true,
  includeOnboarding: true
});
```

**Chat Integration**
```javascript
// Ask questions about repository
const response = await generateText(
  `How do I set up ${repoName}?`,
  { temperature: 0.7, maxNewTokens: 200 }
);
```

## 🔌 API Documentation

### Backend Endpoints

#### POST /api/watsonx/generate

Generate text using IBM watsonx.ai

**Request:**
```json
{
  "prompt": "Explain this repository",
  "options": {
    "temperature": 0.7,
    "maxNewTokens": 200,
    "decodingMethod": "greedy"
  }
}
```

**Response:**
```json
{
  "success": true,
  "text": "Generated text...",
  "model": "ibm/granite-13b-chat-v2"
}
```

#### GET /api/health

Check server health

**Response:**
```json
{
  "status": "ok",
  "message": "Watsonx.ai proxy server is running",
  "config": {
    "hasApiKey": true,
    "hasProjectId": true,
    "regionUrl": "https://us-south.ml.cloud.ibm.com",
    "modelId": "ibm/granite-13b-chat-v2"
  }
}
```

## 🚀 Deployment

### Option 1: Vercel + Render (Recommended)

**Frontend (Vercel):**
```bash
npm install -g vercel
vercel --prod
```

**Backend (Render):**
1. Connect GitHub repository
2. Set start command: `node server.js`
3. Add environment variables
4. Deploy

**Cost:** ~$7/month

### Option 2: IBM Cloud

**Deploy to Code Engine:**
```bash
# Install IBM Cloud CLI
curl -fsSL https://clis.cloud.ibm.com/install/linux | sh

# Login and deploy
ibmcloud login
ibmcloud ce project create --name devdock
ibmcloud ce application create --name devdock-app
```

**Cost:** ~$25-50/month

### Option 3: AWS

**Frontend:** S3 + CloudFront  
**Backend:** Lambda or EC2

**Cost:** ~$15/month

For detailed deployment guides, see [architecture_docs/10_Deployment_Architecture.md](./architecture_docs/10_Deployment_Architecture.md)

## 🧪 Testing

### Run Tests

```bash
npm test
```

### Test Coverage

```bash
npm run test:coverage
```

### Manual Testing

1. Test with various repository sizes
2. Verify AI generation quality
3. Check PDF export functionality
4. Test chat responses
5. Validate security scanning

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
4. **Push to branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Development Guidelines

- Follow existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation
- Ensure all tests pass

## 📊 Performance

### Metrics

- **Initial Load:** < 3 seconds
- **Repository Analysis:** 30-60 seconds
- **AI Generation:** 5-15 seconds per section
- **PDF Export:** 3-5 seconds

### Optimizations

- Token caching (5-minute buffer)
- File content caching (1-hour TTL)
- Parallel API requests
- Lazy component loading
- Code splitting

## 🔒 Security

### Security Measures

- ✅ Environment variable protection
- ✅ IBM IAM authentication
- ✅ Token caching with expiry
- ✅ CORS configuration
- ✅ Input validation
- ✅ No data storage
- ✅ HTTPS in production

### Security Best Practices

1. Never commit `.env` files
2. Rotate API keys regularly
3. Use different keys for dev/prod
4. Enable rate limiting
5. Monitor for vulnerabilities

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **IBM watsonx.ai** - AI capabilities
- **GitHub** - Repository data
- **React Community** - Frontend framework
- **Open Source Contributors** - Various libraries

## 📞 Support

### Documentation

- [Architecture Documentation](./architecture_docs/)
- [API Documentation](#api-documentation)
- [Deployment Guide](./architecture_docs/10_Deployment_Architecture.md)

### Issues

Report bugs or request features on [GitHub Issues](https://github.com/yourusername/devdock/issues)

### Contact

- **Email:** support@devdock.io
- **Twitter:** @devdock
- **Discord:** [Join our community](https://discord.gg/devdock)

## 🗺️ Roadmap

### Version 1.1 (Q2 2026)
- [ ] Support for private repositories
- [ ] Multiple AI model selection
- [ ] Custom prompt templates
- [ ] Team collaboration features

### Version 1.2 (Q3 2026)
- [ ] GitLab integration
- [ ] Bitbucket support
- [ ] Advanced analytics
- [ ] API rate limiting dashboard

### Version 2.0 (Q4 2026)
- [ ] Multi-language support
- [ ] Plugin system
- [ ] Enterprise features
- [ ] Self-hosted option

## 📈 Statistics

- **Lines of Code:** ~5,000+
- **Components:** 20+
- **Services:** 3 core services
- **API Endpoints:** 2
- **Supported Technologies:** 50+
- **Documentation Pages:** 12

## 🎯 Use Cases

### For Developers
- Quickly understand new codebases
- Get started with open-source projects
- Learn project architecture
- Find contribution opportunities

### For Team Leads
- Onboard new team members efficiently
- Generate project documentation
- Share architecture knowledge
- Reduce onboarding time by 80%

### For Open Source Maintainers
- Improve project documentation
- Help contributors get started
- Showcase project architecture
- Increase contributor engagement

---

**Made with ❤️ using Bob IDE**

**Version:** 1.0.0  
**Last Updated:** May 3, 2026  
**Status:** Production Ready 🚀
# Migration Guide: DevDock V1 → V2

This document tracks what needs to be migrated from V1 and what changes are needed.

---

## 📦 Files to Copy/Migrate

### ✅ Direct Copy (Minimal Changes)

These files can be copied with minor updates:

#### Services
- [ ] `src/services/githubService.js` → Update API base URL handling
- [ ] `src/services/watsonxService.js` → Rename to `src/services/llm/watsonxService.js`
- [ ] `src/services/codeAnalysisService.js` → Enhance with new features
- [ ] `src/services/hardcodedDataService.js` → Keep for fallback data

#### Utilities
- [ ] `src/utils/textFormatting.js` → Copy as-is

#### API Routes
- [ ] `api/chat.js` → Enhance with multi-LLM support
- [ ] `api/github/analyze.js` → Add caching and optimization
- [ ] `api/watsonx/generate.js` → Refactor into `api/llm/watsonx.js`

#### Assets
- [ ] `public/devdock-logo.png` → Copy all logo variants
- [ ] `public/devdock-logo-horizontal.svg`
- [ ] `public/devdock-logo-icon.svg`

---

### 🔄 Refactor & Enhance

These files need significant changes:

#### Main App
- [ ] `src/App.jsx` (1233 lines)
  - **Changes Needed**:
    - Split into smaller components
    - Move state to Zustand stores
    - Add routing with React Router
    - Separate concerns (analysis, chat, PDF)
  - **New Structure**:
    ```
    src/
    ├── App.jsx (routing only)
    ├── pages/
    │   ├── LandingPage.jsx
    │   ├── AnalysisPage.jsx
    │   ├── DashboardPage.jsx
    │   └── ChatPage.jsx
    └── store/
        ├── useRepoStore.js
        ├── useAnalysisStore.js
        └── useChatStore.js
    ```

#### Components to Refactor

**Layout Components**:
- [ ] `src/components/Header.jsx` → Enhance with theme toggle, user menu
- [ ] `src/components/Footer.jsx` → Add social links, version info
- [ ] `src/components/InputSection.jsx` → Better validation, loading states
- [ ] `src/components/TabNavigation.jsx` → Replace with React Router navigation

**Tab Content Components**:
- [ ] `src/components/TabContent/Summary.jsx` → Add more metrics
- [ ] `src/components/TabContent/Architecture.jsx` → Enhanced diagrams
- [ ] `src/components/TabContent/Documentation.jsx` → Better formatting
- [ ] `src/components/TabContent/OnboardingGuide.jsx` → Interactive tutorials
- [ ] `src/components/TabContent/SecurityScanner.jsx` → Advanced scanning
- [ ] `src/components/TabContent/Chat.jsx` → Multi-LLM support, streaming

**Diagram Components**:
- [ ] `src/components/TabContent/DynamicDataFlowDiagram.jsx` → Optimize performance
- [ ] `src/components/TabContent/CodeAnalysisDiagrams.jsx` → Add more diagram types
- [ ] `src/components/TabContent/DataFlowDiagram_NEW.jsx` → Merge with Dynamic

**Utility Components**:
- [ ] `src/components/DownloadPDFButton.jsx` → Add more export formats
- [ ] `src/components/DownloadDiagramButton.jsx` → Support multiple formats
- [ ] `src/components/LoadingSpinner.jsx` → Add skeleton screens
- [ ] `src/components/TimeSavedBadge.jsx` → Enhance with animations
- [ ] `src/components/ScrollToTopButton.jsx` → Keep as-is

**Homepage Components** (Optional - may redesign):
- [ ] `src/components/Homepage/HeroSection.jsx`
- [ ] `src/components/Homepage/FeaturesGrid.jsx`
- [ ] `src/components/Homepage/HowItWorks.jsx`
- [ ] `src/components/Homepage/ImpactComparison.jsx`
- [ ] `src/components/Homepage/PoweredByBob.jsx`
- [ ] `src/components/Homepage/ProductivityHighlight.jsx`
- [ ] `src/components/Homepage/CTASection.jsx`

---

## 🆕 New Files to Create

### Services

#### Multi-LLM Support
```
src/services/llm/
├── watsonxService.js (migrated)
├── openaiService.js (new)
├── claudeService.js (new)
├── geminiService.js (new)
├── llmRouter.js (new - smart routing)
└── llmConfig.js (new - model configurations)
```

#### Enhanced Services
```
src/services/
├── analyticsService.js (new - metrics calculation)
├── securityService.js (new - enhanced scanning)
├── cacheService.js (new - response caching)
└── exportService.js (new - multiple export formats)
```

### State Management (Zustand)
```
src/store/
├── useRepoStore.js (repository data)
├── useAnalysisStore.js (analysis results)
├── useChatStore.js (chat history)
├── useUIStore.js (theme, modals, toasts)
├── useSettingsStore.js (user preferences)
└── useLLMStore.js (LLM selection, responses)
```

### Custom Hooks
```
src/hooks/
├── useRepository.js (fetch & analyze repo)
├── useChat.js (chat functionality)
├── useLLM.js (LLM interactions)
├── useAnalytics.js (metrics calculation)
├── useExport.js (PDF/other exports)
└── useTheme.js (dark mode toggle)
```

### Pages (React Router)
```
src/pages/
├── LandingPage.jsx (new homepage)
├── AnalysisPage.jsx (input & analyze)
├── DashboardPage.jsx (results view)
├── ChatPage.jsx (chat interface)
├── SettingsPage.jsx (user settings)
└── NotFoundPage.jsx (404)
```

### New Components
```
src/components/
├── common/
│   ├── Button.jsx
│   ├── Card.jsx
│   ├── Modal.jsx
│   ├── Toast.jsx
│   ├── Skeleton.jsx
│   ├── Badge.jsx
│   └── Tooltip.jsx
├── layout/
│   ├── Navbar.jsx
│   ├── Sidebar.jsx
│   └── Layout.jsx
└── features/
    ├── Dashboard/
    │   ├── MetricsCard.jsx
    │   ├── HealthScore.jsx
    │   ├── TrendChart.jsx
    │   └── ActivityHeatmap.jsx
    ├── Analysis/
    │   ├── ProgressTracker.jsx
    │   ├── ResultsPanel.jsx
    │   └── ComparisonView.jsx
    ├── Chat/
    │   ├── MessageList.jsx
    │   ├── MessageInput.jsx
    │   ├── ModelSelector.jsx
    │   └── SuggestedQuestions.jsx
    └── Settings/
        ├── LLMSettings.jsx
        ├── ThemeSettings.jsx
        └── ExportSettings.jsx
```

### API Routes
```
api/
├── llm/
│   ├── watsonx.js (migrated)
│   ├── openai.js (new)
│   ├── claude.js (new)
│   ├── gemini.js (new)
│   └── router.js (new - route to appropriate LLM)
├── github/
│   └── analyze.js (enhanced)
├── analytics/
│   └── calculate.js (new)
└── export/
    └── generate.js (new)
```

---

## 🔧 Configuration Files

### To Copy
- [ ] `.env.example` → Already created with new vars
- [ ] `vercel.json` → Copy and update if needed
- [ ] `package.json` → Already created with new deps

### To Create
- [x] `.gitignore` → Already created
- [ ] `jsconfig.json` → For better imports
- [ ] `tailwind.config.js` → If using Tailwind
- [ ] `.prettierrc` → Code formatting

---

## 📝 Code Changes Needed

### 1. State Management Migration

**Before (V1 - useState)**:
```javascript
const [repoData, setRepoData] = useState(null);
const [isAnalyzing, setIsAnalyzing] = useState(false);
```

**After (V2 - Zustand)**:
```javascript
import { useRepoStore } from './store/useRepoStore';

const { repoData, isAnalyzing, setRepoData, setIsAnalyzing } = useRepoStore();
```

### 2. API Calls Migration

**Before (V1 - Direct fetch)**:
```javascript
const response = await fetch('/api/watsonx/generate', {
  method: 'POST',
  body: JSON.stringify({ prompt })
});
```

**After (V2 - Axios with interceptors)**:
```javascript
import api from './services/api';

const response = await api.post('/llm/generate', {
  prompt,
  model: 'watsonx'
});
```

### 3. Routing Migration

**Before (V1 - Tab state)**:
```javascript
const [activeTab, setActiveTab] = useState('summary');
```

**After (V2 - React Router)**:
```javascript
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
navigate('/dashboard/summary');
```

### 4. Multi-LLM Support

**New Pattern**:
```javascript
import { useLLMStore } from './store/useLLMStore';

const { selectedModel, generateText } = useLLMStore();

const response = await generateText(prompt, {
  model: selectedModel, // 'watsonx' | 'gpt4' | 'claude' | 'gemini'
  temperature: 0.7
});
```

---

## 🎯 Priority Order

### Phase 1: Foundation (Day 1 Morning)
1. ✅ Project setup (DONE)
2. Copy core services (githubService, watsonxService)
3. Set up Zustand stores
4. Create basic routing structure
5. Implement multi-LLM service layer

### Phase 2: Core Features (Day 1 Afternoon)
6. Migrate analysis logic
7. Create new UI components
8. Implement dashboard layout
9. Add OpenAI/Claude integration

### Phase 3: Enhancements (Day 2 Morning)
10. Enhanced analytics
11. Improved security scanning
12. Better chat interface
13. Real-time features

### Phase 4: Polish (Day 2 Afternoon)
14. UI/UX improvements
15. Testing and bug fixes
16. Documentation
17. Deployment

---

## ✅ Migration Checklist

### Services
- [ ] GitHub service migrated
- [ ] Watsonx service migrated
- [ ] Code analysis service migrated
- [ ] OpenAI service created
- [ ] Claude service created
- [ ] Gemini service created
- [ ] LLM router created

### State Management
- [ ] Repo store created
- [ ] Analysis store created
- [ ] Chat store created
- [ ] UI store created
- [ ] Settings store created

### Components
- [ ] Layout components migrated
- [ ] Tab content components refactored
- [ ] New common components created
- [ ] Dashboard components created
- [ ] Chat components enhanced

### Features
- [ ] Repository analysis working
- [ ] Multi-LLM support working
- [ ] Chat with model selection
- [ ] PDF export working
- [ ] Analytics dashboard
- [ ] Security scanning

### Infrastructure
- [ ] Routing set up
- [ ] API layer configured
- [ ] Environment variables set
- [ ] Build process working
- [ ] Deployment configured

---

## 📊 Progress Tracking

**Overall Progress**: 10% (Setup complete)

- ✅ Project structure created
- ✅ Package.json configured
- ✅ README written
- ✅ Environment template created
- ✅ Project plan documented
- 🔲 Services migration (0%)
- 🔲 Components migration (0%)
- 🔲 New features (0%)
- 🔲 Testing (0%)
- 🔲 Deployment (0%)

---

**Last Updated**: [Current Date]  
**Next Steps**: Start migrating core services from V1

---

Made with ❤️ using Bob IDE
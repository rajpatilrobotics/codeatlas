# Getting Started with DevDock V2

Welcome to DevDock V2! This guide will help you get up and running quickly.

---

## 📁 What You Have Now

Your workspace now contains:

```
/Users/rajpatil/Desktop/
├── devdock/           ← V1 (Original project - preserved)
│   ├── .git/          ← Old commit history
│   └── ...            ← All original code
│
└── devdock-v2/        ← V2 (New enhanced version)
    ├── README.md              ← Project overview
    ├── PROJECT_PLAN.md        ← Feature roadmap
    ├── MIGRATION_GUIDE.md     ← V1→V2 migration tracking
    ├── GETTING_STARTED.md     ← This file
    ├── package.json           ← Dependencies (with new LLM SDKs)
    ├── .env.example           ← Environment template
    ├── .gitignore             ← Git ignore rules
    ├── src/                   ← Source code (empty, ready for migration)
    │   ├── components/
    │   ├── services/
    │   ├── hooks/
    │   ├── contexts/
    │   └── utils/
    ├── api/                   ← Backend routes (empty)
    └── public/                ← Static assets (empty)
```

---

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
cd /Users/rajpatil/Desktop/devdock-v2
npm install
```

This will install:
- React 18.2.0
- Multi-LLM SDKs (OpenAI, Anthropic, Google)
- State management (Zustand)
- Routing (React Router)
- Charts (Recharts)
- And more...

### Step 2: Set Up Environment Variables

```bash
# Copy the template
cp .env.example .env

# Edit with your actual API keys
nano .env  # or use VS Code
```

**Required**:
- `REACT_APP_WATSONX_API_KEY` - From IBM Cloud
- `REACT_APP_WATSONX_PROJECT_ID` - From Watsonx project
- `REACT_APP_GITHUB_TOKEN` - GitHub personal access token

**Optional** (for multi-LLM features):
- `REACT_APP_OPENAI_API_KEY` - From OpenAI
- `REACT_APP_ANTHROPIC_API_KEY` - From Anthropic
- `REACT_APP_GEMINI_API_KEY` - From Google AI Studio

### Step 3: Start Development

```bash
# Option 1: Run both frontend and backend together
npm run dev

# Option 2: Run separately
# Terminal 1 - Frontend (port 3000)
npm start

# Terminal 2 - Backend (port 5001)
npm run server
```

---

## 📋 Next Steps

### For Development

1. **Review the Plan**
   - Read `PROJECT_PLAN.md` for feature roadmap
   - Check `MIGRATION_GUIDE.md` for what to migrate

2. **Start Migrating**
   - Copy core services from V1
   - Refactor components
   - Add new features

3. **Test as You Go**
   - Test each feature before moving to next
   - Keep V1 running for reference

### For Hackathon Submission

1. **When Ready to Commit**
   ```bash
   cd /Users/rajpatil/Desktop/devdock-v2
   git init
   git add .
   git commit -m "Initial commit: DevDock V2 with enhanced features"
   ```

2. **Create GitHub Repo**
   - Go to GitHub.com
   - Create new repository (e.g., "devdock-v2")
   - Don't initialize with README (you already have one)

3. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/devdock-v2.git
   git branch -M main
   git push -u origin main
   ```

---

## 🎯 Development Workflow

### Recommended Order

1. **Phase 1: Core Services** (Start here)
   - Copy `githubService.js` from V1
   - Copy `watsonxService.js` from V1
   - Create multi-LLM router
   - Test API connections

2. **Phase 2: State Management**
   - Create Zustand stores
   - Migrate state from V1
   - Test state updates

3. **Phase 3: UI Components**
   - Create layout components
   - Migrate tab content
   - Add new components

4. **Phase 4: New Features**
   - Multi-LLM integration
   - Analytics dashboard
   - Enhanced security
   - Improved chat

5. **Phase 5: Polish**
   - UI/UX improvements
   - Testing
   - Documentation
   - Deployment

---

## 🔧 Useful Commands

### Development
```bash
npm start              # Start frontend (port 3000)
npm run server         # Start backend (port 5001)
npm run dev            # Start both together
npm run build          # Production build
npm test               # Run tests
```

### Git
```bash
git status             # Check changes
git add .              # Stage all changes
git commit -m "msg"    # Commit with message
git push               # Push to GitHub
```

### Debugging
```bash
# Check if ports are in use
lsof -i :3000
lsof -i :5001

# Kill process on port
kill -9 $(lsof -t -i:3000)
```

---

## 📚 Key Files to Read

1. **README.md** - Project overview and features
2. **PROJECT_PLAN.md** - Detailed feature roadmap
3. **MIGRATION_GUIDE.md** - What to migrate from V1
4. **package.json** - Dependencies and scripts

---

## 🤔 Common Questions

### Q: Can I still access V1 code?
**A:** Yes! V1 is in `/Users/rajpatil/Desktop/devdock` and untouched.

### Q: Will changes in V2 affect V1?
**A:** No, they're completely separate folders.

### Q: How do I reference V1 code?
**A:** Bob (me) can read from both folders. Just ask!

### Q: When should I initialize git?
**A:** After you have some working features to commit.

### Q: What if I want to start over?
**A:** Just delete `devdock-v2` folder and I'll recreate it.

### Q: Can I rename devdock-v2?
**A:** Yes! Just rename the folder. Update paths in scripts if needed.

---

## 🎨 UI Framework Decision

You need to decide on a UI framework. Options:

### Option 1: Tailwind CSS (Recommended)
**Pros**: Fast, utility-first, small bundle, flexible
**Cons**: Learning curve, verbose HTML
**Setup**: `npm install -D tailwindcss postcss autoprefixer`

### Option 2: Material-UI
**Pros**: Complete component library, accessible, professional
**Cons**: Larger bundle, opinionated design
**Setup**: `npm install @mui/material @emotion/react @emotion/styled`

### Option 3: Chakra UI
**Pros**: Accessible, composable, good DX
**Cons**: Smaller ecosystem than MUI
**Setup**: `npm install @chakra-ui/react @emotion/react @emotion/styled`

### Option 4: Custom CSS
**Pros**: Full control, no dependencies
**Cons**: More work, need to build everything
**Setup**: Already set up with CSS Modules

---

## 🚨 Important Notes

1. **Don't commit .env file** - It's in .gitignore
2. **Keep API keys secure** - Never expose in frontend
3. **Test before committing** - Make sure features work
4. **Commit frequently** - Small, focused commits
5. **Write clear messages** - Explain what changed

---

## 🆘 Need Help?

### Ask Bob (Me!)
I can help with:
- Migrating code from V1
- Creating new components
- Debugging issues
- Architecture decisions
- Best practices

### Resources
- React Docs: https://react.dev
- Zustand Docs: https://docs.pmnd.rs/zustand
- React Router: https://reactrouter.com
- Tailwind CSS: https://tailwindcss.com

---

## ✅ Pre-Flight Checklist

Before starting development:

- [ ] Dependencies installed (`npm install`)
- [ ] Environment variables set (`.env` file)
- [ ] Ports 3000 and 5001 available
- [ ] V1 project still accessible for reference
- [ ] Read PROJECT_PLAN.md
- [ ] Read MIGRATION_GUIDE.md
- [ ] Decided on UI framework
- [ ] Ready to code! 🚀

---

## 🎯 Your First Task

**Recommended**: Start by migrating the GitHub service

```bash
# 1. Copy the service from V1
cp ../devdock/src/services/githubService.js src/services/

# 2. Test it works
# 3. Then move to next service
```

Or ask Bob to do it for you! 😊

---

**Happy Coding!** 🎉

Made with ❤️ using Bob IDE
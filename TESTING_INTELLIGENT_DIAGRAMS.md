# Testing Intelligent Diagrams - Verification Guide

## How to Verify the Diagrams Are Working

### Step 1: Analyze a Repository
1. Open the application (http://localhost:3000)
2. Enter a GitHub repository URL (e.g., `https://github.com/facebook/react`)
3. Click "Analyze Repository"
4. Wait for all 7 steps to complete (especially Step 7: Code Analysis)

### Step 2: Navigate to Architecture Tab
1. Click on the "Architecture" tab
2. Scroll down past the existing diagrams
3. Look for the new sections:
   - **"🔄 Data Flow Architecture (From Real Code)"**
   - **"🔄 Function Call Flow (From Code Analysis)"**
   - **"📁 Analyzed File Structure"**

### Step 3: What You Should See

#### If Code Analysis is Loading:
```
🔬 Intelligent Diagrams
⏳ Analyzing code to generate intelligent diagrams...
```

#### If Code Analysis is Complete:
You should see **THREE NEW DIAGRAMS** with real data:

**1. Data Flow Architecture**
- Shows layers: Client → Controllers → Services → Models → Database
- **Real function names** like `handleUserLogin`, `authenticateUser`
- **Actual file names** like `auth.controller.js:45`
- Animated connections with labels

**2. Function Call Flow**
- Grid of function boxes (up to 15)
- **Real function names with parameters**
- **File locations with line numbers**
- Color-coded by type (blue=components, purple=API, green=services)

**3. Analyzed File Structure**
- Tree structure: Root → Directories → Files
- **Real directory names** from the repository
- **Actual file names** with sizes
- Hierarchical layout

### Step 4: Verify Data is Real

**Check for these indicators:**

✅ **Function names** should match actual functions in the repository
✅ **File paths** should be real files from the repo (e.g., `src/auth/controller.js`)
✅ **Line numbers** should be present (e.g., `:45`, `:23`)
✅ **Parameters** should show actual function parameters
✅ **Directory names** should match the repo structure

❌ **NOT these generic placeholders:**
- "Client Layer", "Frontend Layer", "Backend Layer" (without real functions)
- "React", "Node.js" (without specific file references)
- Generic function names like "handleRequest", "processData"

### Step 5: Debugging if Diagrams Don't Show

**Check Browser Console:**
```javascript
// Open DevTools (F12) and check console for:
console.log('Code Analysis:', codeAnalysis);
```

**Expected Output:**
```javascript
{
  summary: { totalFiles: 25, totalLines: 5432, ... },
  definitions: {
    functions: [
      { name: 'handleLogin', file: 'auth.js', line: 45, params: ['username', 'password'] },
      ...
    ],
    classes: [...],
    exports: [...]
  },
  files: [
    { path: 'src/App.jsx', content: '...', size: 1234 },
    ...
  ],
  security: { critical: [], high: [], ... }
}
```

**If `codeAnalysis` is null or undefined:**
- Code analysis didn't run or failed
- Check Step 7 in the analysis process
- Check backend logs for errors

**If `codeAnalysis.definitions` is empty:**
- No functions were detected in the code
- Try a different repository with more code
- Check if the repository has JavaScript/TypeScript files

### Step 6: Compare with Other Tabs

**Verify consistency across tabs:**

1. **Summary Tab** - Should show code analysis stats
2. **Security Scanner** - Should show vulnerabilities from code
3. **Onboarding Guide** - Should show detected frameworks
4. **Documentation** - Should show real API endpoints
5. **Architecture** - Should show intelligent diagrams

All tabs should display **real data from the same code analysis**.

### Example: Testing with a Known Repository

**Good Test Repository:** `https://github.com/expressjs/express`

**Expected Results:**
- **Functions detected:** `app.get`, `app.post`, `router.use`, etc.
- **Files analyzed:** `lib/application.js`, `lib/router/index.js`, etc.
- **Layers detected:** 
  - Controllers: route handlers
  - Services: middleware functions
  - Utils: helper functions

**What You'll See in Diagrams:**
```
Data Flow:
Client → app.get (application.js:123) → router.handle (router.js:45) → Database

Function Flow:
- app.get(path, callback) 📄 application.js:123
- router.use(path, fn) 📄 router.js:45
- Layer.handle_request(req, res) 📄 layer.js:89

File Structure:
express/
  ├── lib/ (15 files)
  │   ├── application.js
  │   ├── router.js
  │   └── middleware.js
  └── test/ (8 files)
```

### Troubleshooting

**Problem:** Diagrams show "Intelligent diagrams will be generated..."
**Solution:** Code analysis hasn't completed yet. Wait for Step 7 to finish.

**Problem:** Diagrams are empty or show no nodes
**Solution:** Repository might not have detectable functions. Try a larger repo.

**Problem:** Diagrams show generic data, not real functions
**Solution:** The old generic diagrams are still showing. The new ones should be BELOW them.

**Problem:** Console shows "codeAnalysis is undefined"
**Solution:** Check if Step 7 (Code Analysis) completed successfully in the backend logs.

### Success Criteria

✅ You should see **real function names** from the repository
✅ You should see **actual file paths** with line numbers
✅ You should see **specific parameters** for functions
✅ Diagrams should be **different for each repository** analyzed
✅ Data should **match what's in the Summary and Security tabs**

### Quick Test Checklist

- [ ] Repository analyzed successfully (all 7 steps complete)
- [ ] Architecture tab loads without errors
- [ ] Three new diagram sections visible
- [ ] Function names are real (not generic placeholders)
- [ ] File paths match actual repository structure
- [ ] Line numbers are present
- [ ] Diagrams are interactive (can zoom, pan)
- [ ] Data matches other tabs (Summary, Security, etc.)

---

## If Everything Works

You should see **intelligent, data-driven diagrams** that show:
- Real functions from the actual codebase
- Actual file locations with line numbers
- Specific function parameters
- Real directory structure
- Different data for each repository

This is a **huge improvement** over generic placeholder diagrams!
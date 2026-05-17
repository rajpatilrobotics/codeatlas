# 🚀 NEXT.JS MIGRATION GUIDE

## 📋 MIGRATION OVERVIEW

**Current:** React (Create React App)  
**Target:** Next.js 14+ with App Router  
**Estimated Time:** 2-3 hours  
**Complexity:** Medium

---

## 🎯 MIGRATION STRATEGY

### Phase 1: Install Next.js Dependencies
### Phase 2: Create Next.js Configuration
### Phase 3: Migrate Project Structure
### Phase 4: Update Package.json Scripts
### Phase 5: Test & Cleanup

---

## 📦 STEP 1: INSTALL DEPENDENCIES

Run these commands:

```bash
# Install Next.js and required dependencies
npm install next@latest

# Install TypeScript support (optional but recommended)
npm install --save-dev typescript @types/react @types/node

# Remove Create React App
npm uninstall react-scripts

# Install additional Next.js utilities
npm install sharp  # For image optimization
```

---

## 📁 STEP 2: PROJECT STRUCTURE TRANSFORMATION

### Current Structure (React CRA):
```
devdock/
├── public/
├── src/
│   ├── App.jsx
│   ├── index.js
│   ├── pages/
│   ├── components/
│   └── styles/
└── package.json
```

### New Structure (Next.js):
```
devdock/
├── app/                    # Next.js App Router
│   ├── (dashboard)/       # Route group for dashboard
│   │   ├── layout.jsx     # Dashboard layout
│   │   ├── page.jsx       # Dashboard home
│   │   ├── architecture/
│   │   ├── blast-radius/
│   │   ├── chat/
│   │   ├── debug/
│   │   ├── documentation/
│   │   ├── heatmap/
│   │   ├── onboarding/
│   │   ├── planner/
│   │   ├── repository-graph/
│   │   ├── security/
│   │   └── workspaces/
│   ├── layout.jsx         # Root layout
│   ├── page.jsx           # Landing page
│   └── globals.css        # Global styles
├── components/            # Shared components
│   ├── layout/
│   ├── ui/
│   └── features/
├── lib/                   # Utilities
│   ├── api.js            # API client
│   └── utils.js          # Helper functions
├── store/                 # Zustand stores
│   ├── useRepoStore.js
│   └── useUIStore.js
├── hooks/                 # Custom hooks
│   ├── usePolling.js
│   └── useRepository.js
├── public/               # Static assets
├── server/               # Backend (unchanged)
├── next.config.js        # Next.js config
└── package.json
```

---

## 🔧 STEP 3: CREATE CONFIGURATION FILES

### 1. Create `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Proxy API requests to backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  
  // Image optimization
  images: {
    domains: ['localhost'],
  },
  
  // Disable x-powered-by header
  poweredByHeader: false,
};

module.exports = nextConfig;
```

### 2. Create `tsconfig.json` (if using TypeScript):

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 3. Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 📝 STEP 4: UPDATE PACKAGE.JSON

Replace the `scripts` section:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "server": "node server/src/server.js",
    "worker": "node server/src/workers/index.js",
    "dev:all": "concurrently \"npm run dev\" \"npm run server\" \"npm run worker\"",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio"
  }
}
```

---

## 🎨 STEP 5: MIGRATE STYLES

### 1. Move `src/styles/global.css` to `app/globals.css`

### 2. Update Tailwind config (`tailwind.config.js`):

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Your custom theme
    },
  },
  plugins: [],
}
```

---

## 📄 STEP 6: CREATE ROOT LAYOUT

Create `app/layout.jsx`:

```jsx
import './globals.css'

export const metadata = {
  title: 'CodeAtlas - AI Developer Intelligence',
  description: 'AI-native developer intelligence platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

---

## 🏠 STEP 7: CREATE LANDING PAGE

Create `app/page.jsx`:

```jsx
'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to dashboard
    router.push('/dashboard')
  }, [router])
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">CodeAtlas</h1>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  )
}
```

---

## 📱 STEP 8: CREATE DASHBOARD LAYOUT

Create `app/(dashboard)/layout.jsx`:

```jsx
'use client'

import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'

export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
```

---

## 📄 STEP 9: MIGRATE PAGES

For each page in `src/pages/`, create a corresponding route in `app/(dashboard)/`:

### Example: Dashboard Page

Create `app/(dashboard)/page.jsx`:

```jsx
'use client'

import Dashboard from '@/components/pages/Dashboard'

export default function DashboardPage() {
  return <Dashboard />
}
```

### Example: Architecture Page

Create `app/(dashboard)/architecture/page.jsx`:

```jsx
'use client'

import Architecture from '@/components/pages/Architecture'

export default function ArchitecturePage() {
  return <Architecture />
}
```

### Repeat for all 12 pages:
- `/` → Dashboard
- `/architecture` → Architecture
- `/blast-radius` → Blast Radius
- `/chat` → Chat
- `/debug` → Debug Navigator
- `/documentation` → Documentation
- `/heatmap` → Heatmap
- `/onboarding` → Onboarding Guide
- `/planner` → Planner
- `/repository-graph` → Repository Graph
- `/security` → Security Scanner
- `/workspaces` → Workspaces

---

## 🔄 STEP 10: UPDATE COMPONENTS

### Add 'use client' directive to interactive components:

Any component that uses:
- `useState`
- `useEffect`
- `onClick` handlers
- Browser APIs

Needs `'use client'` at the top:

```jsx
'use client'

import { useState } from 'react'

export default function MyComponent() {
  const [state, setState] = useState(false)
  // ...
}
```

### Update imports:

```jsx
// Old (React Router)
import { useNavigate } from 'react-router-dom'

// New (Next.js)
import { useRouter } from 'next/navigation'
```

```jsx
// Old
import { Link } from 'react-router-dom'

// New
import Link from 'next/link'
```

---

## 🗂️ STEP 11: MOVE COMPONENTS

Move components from `src/` to root:

```bash
# Move components
mv src/components ./components

# Move styles (if not already moved)
mv src/styles ./styles

# Move any utilities
mkdir lib
mv src/utils/* ./lib/
```

---

## 🔌 STEP 12: CREATE API CLIENT

Create `lib/api.js`:

```javascript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

class ApiClient {
  constructor() {
    this.baseURL = API_URL
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  // Repository APIs
  async analyzeRepository(githubUrl) {
    return this.request('/api/repo/analyze', {
      method: 'POST',
      body: JSON.stringify({ githubUrl }),
    })
  }

  async getRepositoryStatus(jobId) {
    return this.request(`/api/repo/status/${jobId}`)
  }

  async getRepositorySummary(repoId) {
    return this.request(`/api/repo/summary/${repoId}`)
  }

  // Graph APIs
  async getArchitecture(repoId) {
    return this.request(`/api/graph/architecture/${repoId}`)
  }

  async getBlastRadius(repoId, nodeId) {
    return this.request(`/api/graph/blast-radius/${repoId}?nodeId=${nodeId}`)
  }

  // Chat APIs
  async sendChatMessage(sessionId, message) {
    return this.request('/api/chat/query', {
      method: 'POST',
      body: JSON.stringify({ sessionId, message }),
    })
  }

  async getChatHistory(repoId) {
    return this.request(`/api/chat/history/${repoId}`)
  }
}

export const apiClient = new ApiClient()
```

---

## 🏪 STEP 13: CREATE ZUSTAND STORES

Create `store/useRepoStore.js`:

```javascript
import { create } from 'zustand'

export const useRepoStore = create((set) => ({
  currentRepo: null,
  repositories: [],
  loading: false,
  error: null,

  setCurrentRepo: (repo) => set({ currentRepo: repo }),
  setRepositories: (repos) => set({ repositories: repos }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}))
```

Create `store/useUIStore.js`:

```javascript
import { create } from 'zustand'

export const useUIStore = create((set) => ({
  sidebarOpen: true,
  commandPaletteOpen: false,
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
}))
```

---

## 🎣 STEP 14: CREATE CUSTOM HOOKS

Create `hooks/useRepository.js`:

```javascript
import { useQuery, useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { useRepoStore } from '@/store/useRepoStore'

export function useRepository(repoId) {
  return useQuery({
    queryKey: ['repository', repoId],
    queryFn: () => apiClient.getRepositorySummary(repoId),
    enabled: !!repoId,
  })
}

export function useAnalyzeRepository() {
  const setCurrentRepo = useRepoStore((state) => state.setCurrentRepo)
  
  return useMutation({
    mutationFn: (githubUrl) => apiClient.analyzeRepository(githubUrl),
    onSuccess: (data) => {
      setCurrentRepo(data.repository)
    },
  })
}
```

---

## 🧪 STEP 15: TEST THE MIGRATION

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Test each page:**
   - Visit http://localhost:3000
   - Navigate through all 12 pages
   - Check console for errors

3. **Test API integration:**
   - Start backend: `npm run server`
   - Start worker: `npm run worker`
   - Test repository analysis

4. **Check build:**
   ```bash
   npm run build
   npm start
   ```

---

## 🧹 STEP 16: CLEANUP

Once everything works:

1. **Delete old files:**
   ```bash
   rm -rf src/
   rm public/index.html
   rm public/manifest.json
   ```

2. **Update .gitignore:**
   ```
   # Next.js
   .next/
   out/
   .vercel
   
   # Keep existing ignores
   node_modules/
   .env.local
   ```

3. **Remove unused dependencies:**
   ```bash
   npm uninstall react-router-dom react-scripts
   ```

---

## 📊 MIGRATION CHECKLIST

- [ ] Install Next.js dependencies
- [ ] Create next.config.js
- [ ] Create tsconfig.json (if using TypeScript)
- [ ] Update package.json scripts
- [ ] Create app/layout.jsx
- [ ] Create app/page.jsx
- [ ] Create app/(dashboard)/layout.jsx
- [ ] Migrate all 12 pages to app/(dashboard)/
- [ ] Add 'use client' to interactive components
- [ ] Update navigation (Router → Next.js)
- [ ] Move components to root
- [ ] Create API client
- [ ] Create Zustand stores
- [ ] Create custom hooks with TanStack Query
- [ ] Test all pages
- [ ] Test API integration
- [ ] Test build
- [ ] Cleanup old files
- [ ] Update documentation

---

## 🚀 DEPLOYMENT

### Vercel (Recommended):

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables
4. Deploy

### Manual:

```bash
npm run build
npm start
```

---

## 📝 NOTES

- **Server Components:** Use by default for better performance
- **Client Components:** Only when needed (interactivity, hooks)
- **API Routes:** Optional (you have Express backend)
- **Image Optimization:** Use Next.js `<Image>` component
- **Metadata:** Use `metadata` export for SEO

---

## 🆘 TROUBLESHOOTING

### Issue: "Module not found"
**Solution:** Check import paths, use `@/` alias

### Issue: "Hydration error"
**Solution:** Add 'use client' to component

### Issue: "API calls failing"
**Solution:** Check next.config.js rewrites

### Issue: "Styles not loading"
**Solution:** Import globals.css in root layout

---

## ✅ SUCCESS CRITERIA

- ✅ All 12 pages load correctly
- ✅ Navigation works
- ✅ API calls succeed
- ✅ Styles render properly
- ✅ Build completes without errors
- ✅ Production build works

---

**Estimated Total Time:** 2-3 hours  
**Difficulty:** Medium  
**Benefits:** SSR, better SEO, faster performance, Vercel deployment
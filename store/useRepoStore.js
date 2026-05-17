// ============================================
// CODEATLAS - Repository State Store (Zustand)
// ============================================

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

const useRepoStore = create(
  devtools(
    persist(
      (set, get) => ({
        // ============================================
        // STATE
        // ============================================
        
        // Current active repository
        currentRepo: null,
        
        // List of all repositories
        repositories: [],
        
        // Repository analysis jobs
        analysisJobs: {},
        
        // Selected nodes in graphs
        selectedNode: null,
        
        // Graph view state
        graphView: 'architecture', // 'architecture' | 'blast-radius' | 'heatmap' | 'repository'
        
        // Filters
        filters: {
          fileTypes: [],
          complexity: 'all', // 'all' | 'low' | 'medium' | 'high'
          riskLevel: 'all', // 'all' | 'safe' | 'medium' | 'high' | 'critical'
        },

        // ============================================
        // ACTIONS - Repository Management
        // ============================================
        
        setCurrentRepo: (repo) => set({ currentRepo: repo }),
        
        addRepository: (repo) => set((state) => ({
          repositories: [...state.repositories, repo],
        })),
        
        updateRepository: (repoId, updates) => set((state) => ({
          repositories: state.repositories.map((repo) =>
            repo.id === repoId ? { ...repo, ...updates } : repo
          ),
          currentRepo: state.currentRepo?.id === repoId 
            ? { ...state.currentRepo, ...updates } 
            : state.currentRepo,
        })),
        
        removeRepository: (repoId) => set((state) => ({
          repositories: state.repositories.filter((repo) => repo.id !== repoId),
          currentRepo: state.currentRepo?.id === repoId ? null : state.currentRepo,
        })),
        
        setRepositories: (repos) => set({ repositories: repos }),

        // ============================================
        // ACTIONS - Analysis Jobs
        // ============================================
        
        addAnalysisJob: (jobId, jobData) => set((state) => ({
          analysisJobs: {
            ...state.analysisJobs,
            [jobId]: {
              ...jobData,
              startedAt: Date.now(),
              status: 'processing',
            },
          },
        })),
        
        updateAnalysisJob: (jobId, updates) => set((state) => ({
          analysisJobs: {
            ...state.analysisJobs,
            [jobId]: {
              ...state.analysisJobs[jobId],
              ...updates,
            },
          },
        })),
        
        removeAnalysisJob: (jobId) => set((state) => {
          const { [jobId]: removed, ...rest } = state.analysisJobs
          return { analysisJobs: rest }
        }),
        
        clearCompletedJobs: () => set((state) => {
          const activeJobs = Object.entries(state.analysisJobs)
            .filter(([_, job]) => job.status === 'processing')
            .reduce((acc, [id, job]) => ({ ...acc, [id]: job }), {})
          return { analysisJobs: activeJobs }
        }),

        // ============================================
        // ACTIONS - Graph Interactions
        // ============================================
        
        setSelectedNode: (node) => set({ selectedNode: node }),
        
        clearSelectedNode: () => set({ selectedNode: null }),
        
        setGraphView: (view) => set({ graphView: view }),

        // ============================================
        // ACTIONS - Filters
        // ============================================
        
        setFileTypeFilter: (fileTypes) => set((state) => ({
          filters: { ...state.filters, fileTypes },
        })),
        
        setComplexityFilter: (complexity) => set((state) => ({
          filters: { ...state.filters, complexity },
        })),
        
        setRiskLevelFilter: (riskLevel) => set((state) => ({
          filters: { ...state.filters, riskLevel },
        })),
        
        resetFilters: () => set({
          filters: {
            fileTypes: [],
            complexity: 'all',
            riskLevel: 'all',
          },
        }),

        // ============================================
        // SELECTORS
        // ============================================
        
        getActiveJobs: () => {
          const state = get()
          return Object.entries(state.analysisJobs)
            .filter(([_, job]) => job.status === 'processing')
            .map(([id, job]) => ({ id, ...job }))
        },
        
        getCompletedJobs: () => {
          const state = get()
          return Object.entries(state.analysisJobs)
            .filter(([_, job]) => job.status === 'completed')
            .map(([id, job]) => ({ id, ...job }))
        },
        
        getFailedJobs: () => {
          const state = get()
          return Object.entries(state.analysisJobs)
            .filter(([_, job]) => job.status === 'failed')
            .map(([id, job]) => ({ id, ...job }))
        },
        
        getRepositoryById: (repoId) => {
          const state = get()
          return state.repositories.find((repo) => repo.id === repoId)
        },

        // ============================================
        // ACTIONS - Reset
        // ============================================
        
        reset: () => set({
          currentRepo: null,
          repositories: [],
          analysisJobs: {},
          selectedNode: null,
          graphView: 'architecture',
          filters: {
            fileTypes: [],
            complexity: 'all',
            riskLevel: 'all',
          },
        }),
      }),
      {
        name: 'codeatlas-repo-storage',
        partialize: (state) => ({
          currentRepo: state.currentRepo,
          repositories: state.repositories,
        }),
      }
    ),
    { name: 'RepoStore' }
  )
)

export default useRepoStore

// Made with Bob

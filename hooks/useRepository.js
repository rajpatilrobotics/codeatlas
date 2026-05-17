// ============================================
// CODEATLAS - Repository Data Hooks (TanStack Query)
// ============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import useRepoStore from '@/store/useRepoStore'
import useUIStore from '@/store/useUIStore'

// ============================================
// QUERY KEYS
// ============================================

export const repoKeys = {
  all: ['repositories'],
  lists: () => [...repoKeys.all, 'list'],
  list: () => [...repoKeys.lists()],
  details: () => [...repoKeys.all, 'detail'],
  detail: (id) => [...repoKeys.details(), id],
  summary: (id) => [...repoKeys.detail(id), 'summary'],
  onboarding: (id) => [...repoKeys.detail(id), 'onboarding'],
  status: (jobId) => ['job-status', jobId],
}

export const graphKeys = {
  all: (repoId) => ['graph', repoId],
  architecture: (repoId) => [...graphKeys.all(repoId), 'architecture'],
  blastRadius: (repoId, nodeId) => [...graphKeys.all(repoId), 'blast-radius', nodeId],
  heatmap: (repoId) => [...graphKeys.all(repoId), 'heatmap'],
  dependencyTree: (repoId, fileId) => [...graphKeys.all(repoId), 'dependency-tree', fileId],
}

export const chatKeys = {
  all: (repoId) => ['chat', repoId],
  history: (repoId) => [...chatKeys.all(repoId), 'history'],
  session: (sessionId) => ['chat-session', sessionId],
}

export const securityKeys = {
  report: (repoId) => ['security', repoId, 'report'],
}

// ============================================
// REPOSITORY HOOKS
// ============================================

/**
 * Fetch list of all repositories
 */
export function useRepositories() {
  const setRepositories = useRepoStore((state) => state.setRepositories)
  
  return useQuery({
    queryKey: repoKeys.list(),
    queryFn: async () => {
      const data = await apiClient.listRepositories()
      setRepositories(data.repositories)
      return data.repositories
    },
    staleTime: 30000, // 30 seconds
  })
}

/**
 * Fetch repository summary
 */
export function useRepositorySummary(repoId) {
  return useQuery({
    queryKey: repoKeys.summary(repoId),
    queryFn: () => apiClient.getRepositorySummary(repoId),
    enabled: !!repoId,
    staleTime: 60000, // 1 minute
  })
}

/**
 * Fetch repository onboarding guide
 */
export function useRepositoryOnboarding(repoId) {
  return useQuery({
    queryKey: repoKeys.onboarding(repoId),
    queryFn: () => apiClient.getRepositoryOnboarding(repoId),
    enabled: !!repoId,
    staleTime: 300000, // 5 minutes
  })
}

/**
 * Analyze repository mutation
 */
export function useAnalyzeRepository() {
  const queryClient = useQueryClient()
  const addAnalysisJob = useRepoStore((state) => state.addAnalysisJob)
  const showSuccess = useUIStore((state) => state.showSuccess)
  const showError = useUIStore((state) => state.showError)
  
  return useMutation({
    mutationFn: (githubUrl) => apiClient.analyzeRepository(githubUrl),
    onSuccess: (data) => {
      addAnalysisJob(data.jobId, {
        repoUrl: data.repoUrl,
        status: 'processing',
      })
      showSuccess('Repository analysis started')
      queryClient.invalidateQueries({ queryKey: repoKeys.lists() })
    },
    onError: (error) => {
      showError(error.message || 'Failed to start repository analysis')
    },
  })
}

/**
 * Delete repository mutation
 */
export function useDeleteRepository() {
  const queryClient = useQueryClient()
  const removeRepository = useRepoStore((state) => state.removeRepository)
  const showSuccess = useUIStore((state) => state.showSuccess)
  const showError = useUIStore((state) => state.showError)
  
  return useMutation({
    mutationFn: (repoId) => apiClient.deleteRepository(repoId),
    onSuccess: (_, repoId) => {
      removeRepository(repoId)
      showSuccess('Repository deleted successfully')
      queryClient.invalidateQueries({ queryKey: repoKeys.lists() })
    },
    onError: (error) => {
      showError(error.message || 'Failed to delete repository')
    },
  })
}

// ============================================
// GRAPH HOOKS
// ============================================

/**
 * Fetch architecture graph
 */
export function useArchitecture(repoId) {
  return useQuery({
    queryKey: graphKeys.architecture(repoId),
    queryFn: () => apiClient.getArchitecture(repoId),
    enabled: !!repoId,
    staleTime: 300000, // 5 minutes
  })
}

/**
 * Fetch blast radius analysis
 */
export function useBlastRadius(repoId, nodeId) {
  return useQuery({
    queryKey: graphKeys.blastRadius(repoId, nodeId),
    queryFn: () => apiClient.getBlastRadius(repoId, nodeId),
    enabled: !!repoId && !!nodeId,
    staleTime: 60000, // 1 minute
  })
}

/**
 * Fetch heatmap data
 */
export function useHeatmap(repoId) {
  return useQuery({
    queryKey: graphKeys.heatmap(repoId),
    queryFn: () => apiClient.getHeatmap(repoId),
    enabled: !!repoId,
    staleTime: 300000, // 5 minutes
  })
}

/**
 * Fetch dependency tree
 */
export function useDependencyTree(repoId, fileId) {
  return useQuery({
    queryKey: graphKeys.dependencyTree(repoId, fileId),
    queryFn: () => apiClient.getDependencyTree(repoId, fileId),
    enabled: !!repoId && !!fileId,
    staleTime: 300000, // 5 minutes
  })
}

// ============================================
// CHAT HOOKS
// ============================================

/**
 * Fetch chat history
 */
export function useChatHistory(repoId) {
  return useQuery({
    queryKey: chatKeys.history(repoId),
    queryFn: () => apiClient.getChatHistory(repoId),
    enabled: !!repoId,
    staleTime: 30000, // 30 seconds
  })
}

/**
 * Fetch chat session
 */
export function useChatSession(sessionId) {
  return useQuery({
    queryKey: chatKeys.session(sessionId),
    queryFn: () => apiClient.getChatSession(sessionId),
    enabled: !!sessionId,
    staleTime: 30000, // 30 seconds
  })
}

/**
 * Create chat session mutation
 */
export function useCreateChatSession() {
  const queryClient = useQueryClient()
  const showError = useUIStore((state) => state.showError)
  
  return useMutation({
    mutationFn: (repoId) => apiClient.createChatSession(repoId),
    onSuccess: (_, repoId) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.history(repoId) })
    },
    onError: (error) => {
      showError(error.message || 'Failed to create chat session')
    },
  })
}

/**
 * Send chat message mutation
 */
export function useSendChatMessage() {
  const queryClient = useQueryClient()
  const showError = useUIStore((state) => state.showError)
  
  return useMutation({
    mutationFn: ({ sessionId, message }) => 
      apiClient.sendChatMessage(sessionId, message),
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.session(sessionId) })
    },
    onError: (error) => {
      showError(error.message || 'Failed to send message')
    },
  })
}

/**
 * Delete chat session mutation
 */
export function useDeleteChatSession() {
  const queryClient = useQueryClient()
  const showSuccess = useUIStore((state) => state.showSuccess)
  const showError = useUIStore((state) => state.showError)
  
  return useMutation({
    mutationFn: (sessionId) => apiClient.deleteChatSession(sessionId),
    onSuccess: () => {
      showSuccess('Chat session deleted')
      queryClient.invalidateQueries({ queryKey: chatKeys.all() })
    },
    onError: (error) => {
      showError(error.message || 'Failed to delete chat session')
    },
  })
}

// ============================================
// SECURITY HOOKS
// ============================================

/**
 * Fetch security report
 */
export function useSecurityReport(repoId) {
  return useQuery({
    queryKey: securityKeys.report(repoId),
    queryFn: () => apiClient.getSecurityReport(repoId),
    enabled: !!repoId,
    staleTime: 300000, // 5 minutes
  })
}

/**
 * Run security scan mutation
 */
export function useRunSecurityScan() {
  const queryClient = useQueryClient()
  const showSuccess = useUIStore((state) => state.showSuccess)
  const showError = useUIStore((state) => state.showError)
  
  return useMutation({
    mutationFn: (repoId) => apiClient.runSecurityScan(repoId),
    onSuccess: (_, repoId) => {
      showSuccess('Security scan started')
      queryClient.invalidateQueries({ queryKey: securityKeys.report(repoId) })
    },
    onError: (error) => {
      showError(error.message || 'Failed to start security scan')
    },
  })
}

// ============================================
// PLANNER HOOKS
// ============================================

/**
 * Analyze plan mutation
 */
export function useAnalyzePlan() {
  const showError = useUIStore((state) => state.showError)
  
  return useMutation({
    mutationFn: ({ repoId, changes }) => 
      apiClient.analyzePlan(repoId, changes),
    onError: (error) => {
      showError(error.message || 'Failed to analyze plan')
    },
  })
}

/**
 * Get impact analysis
 */
export function useImpactAnalysis(repoId, nodeId) {
  return useQuery({
    queryKey: ['impact-analysis', repoId, nodeId],
    queryFn: () => apiClient.getImpactAnalysis(repoId, nodeId),
    enabled: !!repoId && !!nodeId,
    staleTime: 60000, // 1 minute
  })
}

// ============================================
// DEBUG HOOKS
// ============================================

/**
 * Analyze error mutation
 */
export function useAnalyzeError() {
  const showError = useUIStore((state) => state.showError)
  
  return useMutation({
    mutationFn: ({ repoId, errorMessage, stackTrace }) => 
      apiClient.analyzeError(repoId, errorMessage, stackTrace),
    onError: (error) => {
      showError(error.message || 'Failed to analyze error')
    },
  })
}

/**
 * Get debug suggestions
 */
export function useDebugSuggestions(repoId, fileId) {
  return useQuery({
    queryKey: ['debug-suggestions', repoId, fileId],
    queryFn: () => apiClient.getDebugSuggestions(repoId, fileId),
    enabled: !!repoId && !!fileId,
    staleTime: 300000, // 5 minutes
  })
}

// Made with Bob

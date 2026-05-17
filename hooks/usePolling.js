// ============================================
// CODEATLAS - Polling Hooks for Real-time Updates
// ============================================

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { apiClient } from '@/lib/api'
import useRepoStore from '@/store/useRepoStore'
import useUIStore from '@/store/useUIStore'
import { repoKeys } from './useRepository'

// ============================================
// JOB STATUS POLLING
// ============================================

/**
 * Poll job status with automatic updates
 * @param {string} jobId - Job ID to poll
 * @param {object} options - Polling options
 * @returns {object} Query result with job status
 */
export function useJobStatus(jobId, options = {}) {
  const {
    enabled = true,
    interval = 2000, // Poll every 2 seconds
    onComplete,
    onError,
  } = options

  const queryClient = useQueryClient()
  const updateAnalysisJob = useRepoStore((state) => state.updateAnalysisJob)
  const removeAnalysisJob = useRepoStore((state) => state.removeAnalysisJob)
  const showSuccess = useUIStore((state) => state.showSuccess)
  const showError = useUIStore((state) => state.showError)

  const query = useQuery({
    queryKey: repoKeys.status(jobId),
    queryFn: async () => {
      const data = await apiClient.getRepositoryStatus(jobId)
      
      // Update job in store
      updateAnalysisJob(jobId, {
        status: data.status,
        progress: data.progress,
        stage: data.stage,
        message: data.message,
      })

      return data
    },
    enabled: enabled && !!jobId,
    refetchInterval: (data) => {
      // Stop polling if job is complete or failed
      if (!data) return interval
      if (data.status === 'completed' || data.status === 'failed') {
        return false
      }
      return interval
    },
    refetchIntervalInBackground: false,
  })

  // Handle completion
  useEffect(() => {
    if (query.data?.status === 'completed') {
      showSuccess('Repository analysis completed')
      removeAnalysisJob(jobId)
      queryClient.invalidateQueries({ queryKey: repoKeys.lists() })
      onComplete?.(query.data)
    }
  }, [query.data?.status, jobId, onComplete, showSuccess, removeAnalysisJob, queryClient])

  // Handle errors
  useEffect(() => {
    if (query.data?.status === 'failed') {
      showError(query.data.error || 'Repository analysis failed')
      removeAnalysisJob(jobId)
      onError?.(query.data)
    }
  }, [query.data?.status, query.data?.error, jobId, onError, showError, removeAnalysisJob])

  return query
}

// ============================================
// MULTIPLE JOBS POLLING
// ============================================

/**
 * Poll multiple jobs simultaneously
 * @param {string[]} jobIds - Array of job IDs to poll
 * @param {object} options - Polling options
 * @returns {object[]} Array of query results
 */
export function useMultipleJobStatus(jobIds = [], options = {}) {
  const queries = jobIds.map((jobId) => 
    useJobStatus(jobId, options)
  )

  return {
    queries,
    allCompleted: queries.every((q) => q.data?.status === 'completed'),
    anyFailed: queries.some((q) => q.data?.status === 'failed'),
    isLoading: queries.some((q) => q.isLoading),
    progress: queries.reduce((sum, q) => sum + (q.data?.progress || 0), 0) / queries.length,
  }
}

// ============================================
// ACTIVE JOBS POLLING
// ============================================

/**
 * Automatically poll all active jobs from store
 * @param {object} options - Polling options
 */
export function useActiveJobsPolling(options = {}) {
  const getActiveJobs = useRepoStore((state) => state.getActiveJobs)
  const activeJobs = getActiveJobs()
  const jobIds = activeJobs.map((job) => job.id)

  return useMultipleJobStatus(jobIds, options)
}

// ============================================
// CUSTOM POLLING HOOK
// ============================================

/**
 * Generic polling hook for any query
 * @param {Function} queryFn - Query function to poll
 * @param {object} options - Polling options
 */
export function usePolling(queryFn, options = {}) {
  const {
    enabled = true,
    interval = 5000,
    stopCondition = () => false,
    onUpdate,
  } = options

  const previousData = useRef(null)

  const query = useQuery({
    queryKey: ['polling', queryFn.name],
    queryFn,
    enabled,
    refetchInterval: (data) => {
      if (stopCondition(data)) return false
      return interval
    },
    refetchIntervalInBackground: false,
  })

  // Detect changes and call onUpdate
  useEffect(() => {
    if (query.data && query.data !== previousData.current) {
      onUpdate?.(query.data, previousData.current)
      previousData.current = query.data
    }
  }, [query.data, onUpdate])

  return query
}

// ============================================
// REPOSITORY UPDATES POLLING
// ============================================

/**
 * Poll for repository updates
 * @param {string} repoId - Repository ID
 * @param {object} options - Polling options
 */
export function useRepositoryUpdates(repoId, options = {}) {
  const { interval = 30000 } = options // Poll every 30 seconds
  const updateRepository = useRepoStore((state) => state.updateRepository)

  return useQuery({
    queryKey: repoKeys.summary(repoId),
    queryFn: async () => {
      const data = await apiClient.getRepositorySummary(repoId)
      updateRepository(repoId, data)
      return data
    },
    enabled: !!repoId,
    refetchInterval: interval,
    refetchIntervalInBackground: false,
  })
}

// ============================================
// SYSTEM HEALTH POLLING
// ============================================

/**
 * Poll system health status
 * @param {object} options - Polling options
 */
export function useSystemHealth(options = {}) {
  const { enabled = true, interval = 60000 } = options // Poll every minute

  return useQuery({
    queryKey: ['system', 'health'],
    queryFn: () => apiClient.getSystemHealth(),
    enabled,
    refetchInterval: interval,
    refetchIntervalInBackground: false,
    retry: 1,
  })
}

// ============================================
// CHAT SESSION POLLING
// ============================================

/**
 * Poll chat session for new messages
 * @param {string} sessionId - Chat session ID
 * @param {object} options - Polling options
 */
export function useChatSessionPolling(sessionId, options = {}) {
  const { enabled = true, interval = 3000 } = options // Poll every 3 seconds

  return useQuery({
    queryKey: ['chat-session', sessionId],
    queryFn: () => apiClient.getChatSession(sessionId),
    enabled: enabled && !!sessionId,
    refetchInterval: interval,
    refetchIntervalInBackground: false,
  })
}

// ============================================
// PROGRESS TRACKER
// ============================================

/**
 * Track progress of a long-running operation
 * @param {string} operationId - Operation ID
 * @param {Function} statusFn - Function to get status
 * @param {object} options - Options
 */
export function useProgressTracker(operationId, statusFn, options = {}) {
  const {
    enabled = true,
    interval = 1000,
    onProgress,
    onComplete,
    onError,
  } = options

  const previousProgress = useRef(0)

  const query = useQuery({
    queryKey: ['progress', operationId],
    queryFn: statusFn,
    enabled: enabled && !!operationId,
    refetchInterval: (data) => {
      if (!data) return interval
      if (data.progress >= 100 || data.status === 'completed') return false
      if (data.status === 'failed') return false
      return interval
    },
    refetchIntervalInBackground: false,
  })

  // Track progress changes
  useEffect(() => {
    if (query.data?.progress && query.data.progress !== previousProgress.current) {
      onProgress?.(query.data.progress, previousProgress.current)
      previousProgress.current = query.data.progress
    }
  }, [query.data?.progress, onProgress])

  // Handle completion
  useEffect(() => {
    if (query.data?.status === 'completed' || query.data?.progress >= 100) {
      onComplete?.(query.data)
    }
  }, [query.data?.status, query.data?.progress, onComplete])

  // Handle errors
  useEffect(() => {
    if (query.data?.status === 'failed') {
      onError?.(query.data)
    }
  }, [query.data?.status, onError])

  return {
    ...query,
    progress: query.data?.progress || 0,
    status: query.data?.status || 'pending',
    isComplete: query.data?.status === 'completed' || query.data?.progress >= 100,
    isFailed: query.data?.status === 'failed',
  }
}

// ============================================
// BATCH POLLING
// ============================================

/**
 * Poll multiple resources in batch
 * @param {Array} resources - Array of resources to poll
 * @param {Function} queryFn - Query function
 * @param {object} options - Polling options
 */
export function useBatchPolling(resources = [], queryFn, options = {}) {
  const { interval = 5000, enabled = true } = options

  const queries = resources.map((resource) =>
    useQuery({
      queryKey: ['batch-poll', resource.id],
      queryFn: () => queryFn(resource),
      enabled: enabled && !!resource,
      refetchInterval: interval,
      refetchIntervalInBackground: false,
    })
  )

  return {
    queries,
    data: queries.map((q) => q.data).filter(Boolean),
    isLoading: queries.some((q) => q.isLoading),
    isError: queries.some((q) => q.isError),
    errors: queries.filter((q) => q.isError).map((q) => q.error),
  }
}

// Made with Bob

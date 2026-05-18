'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { apiClient } from '@/lib/api'
import useRepoStore from '@/store/useRepoStore'
import LoadingState from '@/src/components/ui/LoadingState'
import ErrorState from '@/src/components/ui/ErrorState'

/**
 * Dashboard - Repository Mission Control
 * Main intelligence hub for CodeAtlas
 */

function DashboardContent() {
  const searchParams = useSearchParams()
  const currentRepo = useRepoStore((state) => state.currentRepo)
  const setCurrentRepo = useRepoStore((state) => state.setCurrentRepo)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Get repoId from URL params or localStorage
  const repoIdFromUrl = searchParams.get('repoId')
  const repoIdFromStorage = typeof window !== 'undefined' ? localStorage.getItem('currentRepoId') : null
  const repoId = repoIdFromUrl || repoIdFromStorage || currentRepo?.id

  useEffect(() => {
    async function fetchSummary() {
      if (!repoId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        // Fetch repository details and set in store if not already set
        if (!currentRepo || currentRepo.id !== repoId) {
          const repoDetails = await apiClient.getRepositoryStatus(repoId)
          setCurrentRepo({
            id: repoId,
            name: repoDetails.name,
            url: repoDetails.url,
            status: repoDetails.status
          })
        }
        
        const result = await apiClient.getRepositorySummary(repoId)
        setSummary(result)
      } catch (err) {
        console.error('Failed to fetch repository summary:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchSummary()
  }, [repoId, currentRepo, setCurrentRepo])

  if (loading) {
    return (
      <div className="p-8">
        <LoadingState message="Loading dashboard..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <ErrorState message={error} />
      </div>
    )
  }

  if (!currentRepo) {
    return (
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-2" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
            Dashboard
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
            Repository intelligence and mission control
          </p>
        </div>

        {/* Empty State */}
        <div className="mb-6 p-6 rounded-lg text-center" style={{
          backgroundColor: '#111111',
          border: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <div className="text-lg mb-2" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
            No Repository Selected
          </div>
          <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
            Please analyze a repository from the landing page to view the dashboard.
          </div>
        </div>
      </div>
    )
  }

  const stats =
    summary?.stats ||
    (summary?.statistics
      ? {
          totalFiles: summary.statistics.files,
          totalEntities: summary.statistics.entities,
          totalRelationships: summary.statistics.relationships,
          totalDependencies: summary.statistics.relationships,
        }
      : {})
  const repoName = currentRepo.name || currentRepo.url?.split('/').pop() || 'Unknown'
  const lastAnalyzed = summary?.repository?.analyzedAt
    ? new Date(summary.repository.analyzedAt).toLocaleDateString()
    : '—'

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
          Dashboard
        </h1>
        <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
          Repository intelligence and mission control
        </p>
      </div>

      {/* Repository Overview Card */}
      <div className="mb-6 p-6 rounded-lg" style={{
        backgroundColor: '#111111',
        border: '1px solid rgba(255, 255, 255, 0.06)'
      }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
            Repository Overview
          </h2>
          <span className="text-xs px-2 py-1 rounded" style={{
            backgroundColor: 'rgba(0, 229, 255, 0.1)',
            color: 'rgba(0, 229, 255, 0.8)'
          }}>
            {currentRepo.status || 'Ready'}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-xs mb-1" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>Repository</div>
            <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>{repoName}</div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>Last Analyzed</div>
            <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>{lastAnalyzed}</div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>Status</div>
            <div className="text-sm" style={{ color: 'rgba(0, 229, 255, 0.8)' }}>
              {currentRepo.status === 'completed' ? 'Analysis Complete' : 'Processing'}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-lg" style={{
          backgroundColor: '#111111',
          border: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <div className="text-xs mb-2" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>Total Files</div>
          <div className="text-2xl font-semibold" style={{ color: 'rgba(0, 229, 255, 0.8)' }}>
            {stats.totalFiles || 0}
          </div>
        </div>
        <div className="p-4 rounded-lg" style={{
          backgroundColor: '#111111',
          border: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <div className="text-xs mb-2" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>Dependencies</div>
          <div className="text-2xl font-semibold" style={{ color: 'rgba(0, 229, 255, 0.8)' }}>
            {stats.totalDependencies || 0}
          </div>
        </div>
        <div className="p-4 rounded-lg" style={{
          backgroundColor: '#111111',
          border: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <div className="text-xs mb-2" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>Entities</div>
          <div className="text-2xl font-semibold" style={{ color: 'rgba(100, 150, 200, 0.7)' }}>
            {stats.totalEntities || 0}
          </div>
        </div>
        <div className="p-4 rounded-lg" style={{
          backgroundColor: '#111111',
          border: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <div className="text-xs mb-2" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>Relationships</div>
          <div className="text-2xl font-semibold" style={{ color: 'rgba(255, 193, 7, 0.8)' }}>
            {stats.totalRelationships || 0}
          </div>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
          Quick Navigation
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <a
            href="/dashboard/summary"
            className="p-4 rounded-lg transition-colors"
            style={{
              backgroundColor: '#111111',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            <div className="text-sm font-medium mb-1" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
              Summary
            </div>
            <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
              Repository overview and insights
            </div>
          </a>
          <a
            href="/dashboard/architecture"
            className="p-4 rounded-lg transition-colors"
            style={{
              backgroundColor: '#111111',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            <div className="text-sm font-medium mb-1" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
              Architecture
            </div>
            <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
              System architecture visualization
            </div>
          </a>
          <a
            href="/dashboard/repository-graph"
            className="p-4 rounded-lg transition-colors"
            style={{
              backgroundColor: '#111111',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            <div className="text-sm font-medium mb-1" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
              Repository Graph
            </div>
            <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
              Dependency graph analysis
            </div>
          </a>
          <a
            href="/dashboard/blast-radius"
            className="p-4 rounded-lg transition-colors"
            style={{
              backgroundColor: '#111111',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            <div className="text-sm font-medium mb-1" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
              Blast Radius
            </div>
            <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
              Impact analysis for changes
            </div>
          </a>
          <a
            href="/dashboard/security"
            className="p-4 rounded-lg transition-colors"
            style={{
              backgroundColor: '#111111',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            <div className="text-sm font-medium mb-1" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
              Security Scanner
            </div>
            <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
              Security vulnerabilities scan
            </div>
          </a>
          <a
            href="/dashboard/chat"
            className="p-4 rounded-lg transition-colors"
            style={{
              backgroundColor: '#111111',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            <div className="text-sm font-medium mb-1" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
              AI Chat
            </div>
            <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
              Ask questions about your code
            </div>
          </a>
        </div>
      </div>

      {/* AI Recommendations */}
      <div>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
          AI Recommendations
        </h2>
        <div className="p-6 rounded-lg" style={{
          backgroundColor: '#111111',
          border: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          {summary?.insights && summary.insights.length > 0 ? (
            <div className="space-y-4">
              {summary.insights.map((insight, index) => (
                <div key={index} className="pb-4 border-b border-gray-800 last:border-0">
                  <div className="text-sm mb-2" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
                    {insight.title || insight}
                  </div>
                  {insight.description && (
                    <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
                      {insight.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-sm mb-2" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
                No AI insights available yet
              </div>
              <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
                AI-powered insights will appear here after analysis completes
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="p-8">
        <LoadingState message="Loading dashboard..." />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}

// Made with Bob

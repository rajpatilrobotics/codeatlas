'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'
import { useActiveRepo } from '@/hooks/useActiveRepo'
import LoadingState from '@/src/components/ui/LoadingState'
import ErrorState from '@/src/components/ui/ErrorState'

function DashboardContent() {
  const { repoId, currentRepo, loading: repoLoading, hasRepo, error: repoError } = useActiveRepo()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const summaryHref = repoId ? `/dashboard/summary?repoId=${encodeURIComponent(repoId)}` : '/dashboard/summary'
  const architectureHref = repoId ? `/dashboard/architecture?repoId=${encodeURIComponent(repoId)}` : '/dashboard/architecture'
  const graphHref = repoId ? `/dashboard/repository-graph?repoId=${encodeURIComponent(repoId)}` : '/dashboard/repository-graph'
  const blastHref = repoId ? `/dashboard/blast-radius?repoId=${encodeURIComponent(repoId)}` : '/dashboard/blast-radius'
  const securityHref = repoId ? `/dashboard/security?repoId=${encodeURIComponent(repoId)}` : '/dashboard/security'
  const chatHref = repoId ? `/dashboard/chat?repoId=${encodeURIComponent(repoId)}` : '/dashboard/chat'

  useEffect(() => {
    async function fetchSummary() {
      if (!repoId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const result = await apiClient.getRepositorySummary(repoId)
        setSummary(result)
      } catch (err) {
        console.error('Failed to fetch repository summary:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (!repoLoading) {
      fetchSummary()
    }
  }, [repoId, repoLoading])

  if (repoLoading || loading) {
    return (
      <div className="p-8">
        <LoadingState message="Loading dashboard..." />
      </div>
    )
  }

  if (error || repoError) {
    return (
      <div className="p-8">
        <ErrorState message={error || repoError} />
      </div>
    )
  }

  if (!hasRepo || !repoId) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-2" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
            Dashboard
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
            Repository intelligence and mission control
          </p>
        </div>
        <div
          className="mb-6 p-6 rounded-lg text-center"
          style={{ backgroundColor: '#111111', border: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
          <div className="text-lg mb-2" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
            No Repository Selected
          </div>
          <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
            <a href="/" className="text-cyan-400 underline">
              Analyze a repository
            </a>{' '}
            from the landing page to get started.
          </div>
        </div>
      </div>
    )
  }

  const displayRepo = currentRepo?.name ? currentRepo : summary?.repository || { id: repoId }
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
  const repoName = displayRepo.name || displayRepo.url?.split('/').pop() || 'Repository'
  const lastAnalyzed = summary?.repository?.analyzedAt
    ? new Date(summary.repository.analyzedAt).toLocaleDateString()
    : '—'

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
          Dashboard
        </h1>
        <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
          {summary?.repository?.url || displayRepo.url || 'Repository intelligence'}
        </p>
      </div>

      <div
        className="mb-6 p-6 rounded-lg"
        style={{ backgroundColor: '#111111', border: '1px solid rgba(255, 255, 255, 0.06)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
            Repository Overview
          </h2>
          <span
            className="text-xs px-2 py-1 rounded"
            style={{ backgroundColor: 'rgba(0, 229, 255, 0.1)', color: 'rgba(0, 229, 255, 0.8)' }}
          >
            {displayRepo.status || summary?.repository?.status || 'Ready'}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-xs mb-1" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
              Repository
            </div>
            <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
              {repoName}
            </div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
              Last Analyzed
            </div>
            <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
              {lastAnalyzed}
            </div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
              Status
            </div>
            <div className="text-sm" style={{ color: 'rgba(0, 229, 255, 0.8)' }}>
              {(displayRepo.status || summary?.repository?.status) === 'completed'
                ? 'Analysis Complete'
                : 'Processing'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          ['Total Files', stats.totalFiles || 0],
          ['Dependencies', stats.totalDependencies || 0],
          ['Entities', stats.totalEntities || 0],
          ['Relationships', stats.totalRelationships || 0],
        ].map(([label, value]) => (
          <div
            key={label}
            className="p-4 rounded-lg"
            style={{ backgroundColor: '#111111', border: '1px solid rgba(255, 255, 255, 0.06)' }}
          >
            <div className="text-xs mb-2" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
              {label}
            </div>
            <div className="text-2xl font-semibold" style={{ color: 'rgba(0, 229, 255, 0.8)' }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {summary?.summary && (
        <div
          className="mb-8 p-6 rounded-lg"
          style={{ backgroundColor: '#111111', border: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
            Analysis Summary
          </h2>
          <div className="text-sm whitespace-pre-wrap" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
            {summary.summary}
          </div>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
          Quick Navigation
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            [summaryHref, 'Summary', 'Repository overview and insights'],
            [architectureHref, 'Architecture', 'System architecture visualization'],
            [graphHref, 'Repository Graph', 'Dependency graph analysis'],
            [blastHref, 'Blast Radius', 'Impact analysis for changes'],
            [securityHref, 'Security Scanner', 'Security vulnerabilities scan'],
            [chatHref, 'AI Chat', 'Ask questions about your code'],
          ].map(([href, title, desc]) => (
            <a
              key={href}
              href={href}
              className="p-4 rounded-lg transition-colors"
              style={{ backgroundColor: '#111111', border: '1px solid rgba(255, 255, 255, 0.06)' }}
            >
              <div className="text-sm font-medium mb-1" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
                {title}
              </div>
              <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
                {desc}
              </div>
            </a>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
          AI Recommendations
        </h2>
        <div
          className="p-6 rounded-lg"
          style={{ backgroundColor: '#111111', border: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
          {summary?.insights?.length > 0 ? (
            <div className="space-y-4">
              {summary.insights.map((insight, index) => (
                <div key={index} className="pb-4 border-b border-gray-800 last:border-0">
                  <div className="text-sm mb-2" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
                    {insight.title}
                  </div>
                  <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
                    {insight.description}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-sm mb-2" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
                {stats.totalFiles === 0
                  ? 'No analysis data yet — re-run analyze from the home page.'
                  : 'Insights loading… refresh if this persists.'}
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
    <Suspense
      fallback={
        <div className="p-8">
          <LoadingState message="Loading dashboard..." />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}

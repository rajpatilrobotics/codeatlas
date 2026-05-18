'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'
import { useActiveRepo } from '@/hooks/useActiveRepo'
import LoadingState from '@/src/components/ui/LoadingState'
import ErrorState from '@/src/components/ui/ErrorState'

function SummaryContent() {
  const { repoId, currentRepo, loading: repoLoading, hasRepo, error: repoError } = useActiveRepo()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
        <LoadingState message="Loading summary..." />
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
            Summary
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
            Repository overview and AI-generated insights
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
            Analyze a repository from the{' '}
            <a href="/" className="text-cyan-400 underline">
              home page
            </a>{' '}
            first.
          </div>
        </div>
      </div>
    )
  }

  const repoName =
    currentRepo?.name ||
    summary?.repository?.name ||
    currentRepo?.url?.split('/').pop() ||
    'Repository'
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
  const techStack = summary?.techStack || []
  const aiSummary = summary?.summary || summary?.description
  const quickStart = summary?.quickStart || summary?.setupInstructions
  const insights = summary?.insights || []

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
          Summary
        </h1>
        <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
          {summary?.repository?.url || currentRepo?.url || 'Repository overview'}
        </p>
      </div>

      <div
        className="mb-6 p-6 rounded-lg"
        style={{ backgroundColor: '#111111', border: '1px solid rgba(255, 255, 255, 0.06)' }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
          Repository Overview
        </h2>
        <div className="text-sm mb-4" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
          <strong>{repoName}</strong>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs mb-1" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
              Total Files
            </div>
            <div className="text-lg font-semibold" style={{ color: 'rgba(0, 229, 255, 0.8)' }}>
              {stats.totalFiles || 0}
            </div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
              Dependencies
            </div>
            <div className="text-lg font-semibold" style={{ color: 'rgba(0, 229, 255, 0.8)' }}>
              {stats.totalDependencies || 0}
            </div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
              Entities
            </div>
            <div className="text-lg font-semibold" style={{ color: 'rgba(0, 229, 255, 0.8)' }}>
              {stats.totalEntities || 0}
            </div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
              Relationships
            </div>
            <div className="text-lg font-semibold" style={{ color: 'rgba(0, 229, 255, 0.8)' }}>
              {stats.totalRelationships || 0}
            </div>
          </div>
        </div>
      </div>

      {insights.length > 0 && (
        <div
          className="mb-6 p-6 rounded-lg"
          style={{ backgroundColor: '#111111', border: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
            Insights
          </h2>
          <div className="space-y-3">
            {insights.map((item, i) => (
              <div key={i}>
                <div className="text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
                  {item.title}
                </div>
                <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
                  {item.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className="mb-6 p-6 rounded-lg"
        style={{ backgroundColor: '#111111', border: '1px solid rgba(255, 255, 255, 0.06)' }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
          AI Generated Summary
        </h2>
        <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
          {aiSummary ? <p>{aiSummary}</p> : <p>Run analysis from the home page to generate a summary.</p>}
        </div>
      </div>

      <div
        className="mb-6 p-6 rounded-lg"
        style={{ backgroundColor: '#111111', border: '1px solid rgba(255, 255, 255, 0.06)' }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
          Tech Stack
        </h2>
        <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
          {techStack.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {techStack.map((tech, index) => (
                <span
                  key={index}
                  className="px-3 py-1 rounded text-xs"
                  style={{
                    backgroundColor: 'rgba(0, 229, 255, 0.1)',
                    color: 'rgba(0, 229, 255, 0.8)',
                    border: '1px solid rgba(0, 229, 255, 0.2)',
                  }}
                >
                  {tech.name}
                  {tech.fileCount != null ? ` (${tech.fileCount})` : ''}
                </span>
              ))}
            </div>
          ) : (
            <p>No language data yet — try re-analyzing the repository.</p>
          )}
        </div>
      </div>

      <div
        className="mb-6 p-6 rounded-lg"
        style={{ backgroundColor: '#111111', border: '1px solid rgba(255, 255, 255, 0.06)' }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
          Quick Start Guide
        </h2>
        <div className="text-sm whitespace-pre-wrap" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
          {quickStart || 'Setup steps appear after a successful analysis.'}
        </div>
      </div>
    </div>
  )
}

export default function SummaryPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8">
          <LoadingState message="Loading summary..." />
        </div>
      }
    >
      <SummaryContent />
    </Suspense>
  )
}

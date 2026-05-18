'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'
import useRepoStore from '@/store/useRepoStore'
import LoadingState from '@/src/components/ui/LoadingState'
import ErrorState from '@/src/components/ui/ErrorState'

/**
 * Summary Page
 * Repository overview and AI-generated insights
 */

export default function SummaryPage() {
  const currentRepo = useRepoStore((state) => state.currentRepo)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchSummary() {
      if (!currentRepo?.id) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const result = await apiClient.getRepositorySummary(currentRepo.id)
        setSummary(result)
      } catch (err) {
        console.error('Failed to fetch repository summary:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchSummary()
  }, [currentRepo?.id])

  if (loading) {
    return (
      <div className="p-8">
        <LoadingState message="Loading summary..." />
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
            Summary
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
            Repository overview and AI-generated insights
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
            Please analyze a repository from the landing page to see the summary.
          </div>
        </div>
      </div>
    )
  }

  const repoName = currentRepo.name || currentRepo.url?.split('/').pop() || 'Unknown'
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

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
          Summary
        </h1>
        <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
          Repository overview and AI-generated insights
        </p>
      </div>

      {/* Repository Overview */}
      <div className="mb-6 p-6 rounded-lg" style={{
        backgroundColor: '#111111',
        border: '1px solid rgba(255, 255, 255, 0.06)'
      }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
          Repository Overview
        </h2>
        <div className="text-sm mb-4" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
          <strong>{repoName}</strong>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs mb-1" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>Total Files</div>
            <div className="text-lg font-semibold" style={{ color: 'rgba(0, 229, 255, 0.8)' }}>
              {stats.totalFiles || 0}
            </div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>Dependencies</div>
            <div className="text-lg font-semibold" style={{ color: 'rgba(0, 229, 255, 0.8)' }}>
              {stats.totalDependencies || 0}
            </div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>Entities</div>
            <div className="text-lg font-semibold" style={{ color: 'rgba(0, 229, 255, 0.8)' }}>
              {stats.totalEntities || 0}
            </div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>Relationships</div>
            <div className="text-lg font-semibold" style={{ color: 'rgba(0, 229, 255, 0.8)' }}>
              {stats.totalRelationships || 0}
            </div>
          </div>
        </div>
      </div>

      {/* AI Generated Summary */}
      <div className="mb-6 p-6 rounded-lg" style={{
        backgroundColor: '#111111',
        border: '1px solid rgba(255, 255, 255, 0.06)'
      }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
          AI Generated Summary
        </h2>
        <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
          {aiSummary ? (
            <p>{aiSummary}</p>
          ) : (
            <p>AI-powered insights will appear here after repository analysis completes.</p>
          )}
        </div>
      </div>

      {/* Tech Stack */}
      <div className="mb-6 p-6 rounded-lg" style={{
        backgroundColor: '#111111',
        border: '1px solid rgba(255, 255, 255, 0.06)'
      }}>
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
                    border: '1px solid rgba(0, 229, 255, 0.2)'
                  }}
                >
                  {tech.name || tech}
                </span>
              ))}
            </div>
          ) : (
            <p>Technology stack information will be displayed here after analysis.</p>
          )}
        </div>
      </div>

      {/* Quick Start Guide */}
      <div className="mb-6 p-6 rounded-lg" style={{
        backgroundColor: '#111111',
        border: '1px solid rgba(255, 255, 255, 0.06)'
      }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
          Quick Start Guide
        </h2>
        <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
          {quickStart ? (
            <div className="whitespace-pre-wrap">{quickStart}</div>
          ) : (
            <p>Setup instructions and quick start guide will be generated here.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Made with Bob

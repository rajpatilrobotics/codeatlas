'use client'

/**
 * Summary Page
 * Repository overview and AI-generated insights
 */

export default function SummaryPage() {
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
        <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
          <p className="mb-4">No repository analyzed yet. Please analyze a repository from the landing page to see the summary.</p>
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
          <p>AI-powered insights will appear here after repository analysis.</p>
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
          <p>Technology stack information will be displayed here.</p>
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
          <p>Setup instructions and quick start guide will be generated here.</p>
        </div>
      </div>
    </div>
  )
}

// Made with Bob

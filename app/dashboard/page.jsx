'use client'

/**
 * Dashboard - Repository Mission Control
 * Main intelligence hub for CodeAtlas
 */

export default function DashboardPage() {
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
            Ready
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-xs mb-1" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>Repository</div>
            <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>No repository loaded</div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>Last Analyzed</div>
            <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>—</div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>Status</div>
            <div className="text-sm" style={{ color: 'rgba(0, 229, 255, 0.8)' }}>Awaiting analysis</div>
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
          <div className="text-2xl font-semibold" style={{ color: 'rgba(0, 229, 255, 0.8)' }}>—</div>
        </div>
        <div className="p-4 rounded-lg" style={{
          backgroundColor: '#111111',
          border: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <div className="text-xs mb-2" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>Dependencies</div>
          <div className="text-2xl font-semibold" style={{ color: 'rgba(0, 229, 255, 0.8)' }}>—</div>
        </div>
        <div className="p-4 rounded-lg" style={{
          backgroundColor: '#111111',
          border: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <div className="text-xs mb-2" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>Risk Score</div>
          <div className="text-2xl font-semibold" style={{ color: 'rgba(100, 150, 200, 0.7)' }}>—</div>
        </div>
        <div className="p-4 rounded-lg" style={{
          backgroundColor: '#111111',
          border: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <div className="text-xs mb-2" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>Issues</div>
          <div className="text-2xl font-semibold" style={{ color: 'rgba(255, 193, 7, 0.8)' }}>—</div>
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
          <div className="text-center py-8">
            <div className="text-sm mb-2" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
              No repository analyzed yet
            </div>
            <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
              Analyze a repository to get AI-powered insights and recommendations
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Made with Bob

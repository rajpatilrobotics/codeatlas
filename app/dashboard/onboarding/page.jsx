'use client'

/**
 * Onboarding Guide Page
 * Help developers understand and navigate the codebase
 */

export default function OnboardingPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
          Onboarding Guide
        </h1>
        <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
          Get started with the codebase quickly
        </p>
      </div>

      {/* Code Insights */}
      <div className="mb-6 p-6 rounded-lg" style={{
        backgroundColor: '#111111',
        border: '1px solid rgba(255, 255, 255, 0.06)'
      }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
          Code Insights
        </h2>
        <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
          <p>AI-powered insights about the codebase structure and patterns will appear here.</p>
        </div>
      </div>

      {/* Frameworks & Technologies */}
      <div className="mb-6 p-6 rounded-lg" style={{
        backgroundColor: '#111111',
        border: '1px solid rgba(255, 255, 255, 0.06)'
      }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
          Frameworks & Technologies
        </h2>
        <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
          <p>Detected frameworks and technologies will be listed here.</p>
        </div>
      </div>

      {/* Key Functions */}
      <div className="mb-6 p-6 rounded-lg" style={{
        backgroundColor: '#111111',
        border: '1px solid rgba(255, 255, 255, 0.06)'
      }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
          Key Functions
        </h2>
        <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
          <p>Important functions and entry points will be documented here.</p>
        </div>
      </div>

      {/* Architecture Patterns */}
      <div className="mb-6 p-6 rounded-lg" style={{
        backgroundColor: '#111111',
        border: '1px solid rgba(255, 255, 255, 0.06)'
      }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
          Architecture Patterns
        </h2>
        <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
          <p>Detected architecture patterns and design principles will be explained here.</p>
        </div>
      </div>

      {/* Key Components */}
      <div className="p-6 rounded-lg" style={{
        backgroundColor: '#111111',
        border: '1px solid rgba(255, 255, 255, 0.06)'
      }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
          Key Components
        </h2>
        <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
          <p>Main components and modules will be identified here.</p>
        </div>
      </div>
    </div>
  )
}

// Made with Bob

'use client'

/**
 * Chat Page
 * AI-powered code chat workspace
 */

export default function ChatPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
          AI Chat
        </h1>
        <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
          Ask questions about your codebase with AI assistance
        </p>
      </div>

      {/* Chat Interface */}
      <div className="max-w-4xl mx-auto">
        {/* Empty State */}
        <div className="text-center py-12">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{
              backgroundColor: 'rgba(0, 229, 255, 0.1)'
            }}>
              <span className="text-2xl">💬</span>
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
            Start a conversation
          </h2>
          <p className="text-sm mb-8" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
            Ask questions about your codebase, get explanations, or request code improvements
          </p>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {['Explain', 'Debug', 'Improve', 'Setup'].map((action) => (
              <button
                key={action}
                className="p-3 rounded-lg text-sm transition-colors"
                style={{
                  backgroundColor: '#111111',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  color: 'rgba(255, 255, 255, 0.95)'
                }}
              >
                {action}
              </button>
            ))}
          </div>

          {/* Suggested Questions */}
          <div className="text-left max-w-2xl mx-auto">
            <div className="text-xs mb-3" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
              Suggested questions:
            </div>
            <div className="space-y-2">
              {[
                'What does this project do?',
                'How do I set up this project?',
                'What are the main components?',
                'Where is authentication handled?'
              ].map((question, i) => (
                <button
                  key={i}
                  className="w-full text-left p-3 rounded-lg text-sm transition-colors"
                  style={{
                    backgroundColor: '#111111',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    color: 'rgba(255, 255, 255, 0.65)'
                  }}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Input */}
        <div className="mt-8">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Ask anything about your codebase..."
              className="flex-1 px-4 py-3 rounded-lg text-sm"
              style={{
                backgroundColor: '#111111',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                color: 'rgba(255, 255, 255, 0.95)'
              }}
            />
            <button
              className="px-6 py-3 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'rgba(0, 229, 255, 0.8)',
                color: '#0A0A0A'
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Made with Bob

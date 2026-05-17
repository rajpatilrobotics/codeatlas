'use client'

export default function WorkspacesPage() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Saved Workspaces</h1>
        <p className="text-gray-400 mb-8">
          Your analyzed repositories and saved workspaces
        </p>
        
        {/* Empty State */}
        <div className="bg-[#111111] border border-[#222222] rounded-lg p-12 text-center">
          <div className="text-gray-500 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No workspaces yet</h3>
          <p className="text-gray-500 mb-6">
            Analyze a repository to create your first workspace
          </p>
          <a 
            href="/"
            className="inline-block px-6 py-3 bg-[#00D9FF] text-black font-medium rounded-lg hover:bg-[#00C4E6] transition-colors"
          >
            Analyze Repository
          </a>
        </div>
      </div>
    </div>
  )
}

// Made with Bob

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const router = useRouter()
  const [repoUrl, setRepoUrl] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleAnalyze = async () => {
    if (!repoUrl.trim()) return
    
    setIsAnalyzing(true)
    // Navigate to analyzing page with repo URL
    router.push(`/analyzing?repo=${encodeURIComponent(repoUrl)}`)
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-4">
      {/* Main Content */}
      <div className="max-w-2xl w-full text-center">
        {/* Branding */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            CodeAtlas
          </h1>
          <p className="text-xl text-gray-400">Understand Systems. Predict Impact.</p>
        </div>

        {/* Repository Input */}
        <div className="mb-8">
          <div className="flex gap-3 max-w-xl mx-auto">
            <input
              type="text"
              placeholder="https://github.com/username/repository"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
              className="flex-1 px-4 py-3 bg-[#111111] border border-[#222222] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00D9FF] transition-colors"
              disabled={isAnalyzing}
            />
            <button
              onClick={handleAnalyze}
              disabled={!repoUrl.trim() || isAnalyzing}
              className="px-6 py-3 bg-[#00D9FF] text-black font-medium rounded-lg hover:bg-[#00C4E6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Repository'}
            </button>
          </div>
        </div>

        {/* Feature Checklist */}
        <div className="max-w-md mx-auto text-left space-y-2 mb-12">
          <div className="flex items-center gap-3 text-gray-400">
            <span className="text-[#00D9FF]">✓</span>
            <span>Architecture Intelligence</span>
          </div>
          <div className="flex items-center gap-3 text-gray-400">
            <span className="text-[#00D9FF]">✓</span>
            <span>Dependency Mapping</span>
          </div>
          <div className="flex items-center gap-3 text-gray-400">
            <span className="text-[#00D9FF]">✓</span>
            <span>Blast Radius Analysis</span>
          </div>
          <div className="flex items-center gap-3 text-gray-400">
            <span className="text-[#00D9FF]">✓</span>
            <span>Security Scanning</span>
          </div>
          <div className="flex items-center gap-3 text-gray-400">
            <span className="text-[#00D9FF]">✓</span>
            <span>AI Engineering Copilot</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-sm text-gray-500">
          Built by{' '}
          <a
            href="https://www.linkedin.com/in/rajpatilrobotics"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00D9FF] hover:underline"
          >
            Raj Patil
          </a>
        </div>
      </div>
    </div>
  )
}

// Made with Bob

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiClient } from '@/lib/api'

function AnalyzingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const repoUrl = searchParams.get('repo')
  
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [repositoryId, setRepositoryId] = useState(null)
  const [error, setError] = useState(null)
  
  const steps = [
    { id: 1, label: 'Cloning repository', progress: 10 },
    { id: 2, label: 'Parsing file structure', progress: 25 },
    { id: 3, label: 'Detecting architecture', progress: 40 },
    { id: 4, label: 'Building dependency graph', progress: 60 },
    { id: 5, label: 'Running security analysis', progress: 75 },
    { id: 6, label: 'Generating AI insights', progress: 90 },
    { id: 7, label: 'Preparing onboarding workspace', progress: 100 }
  ]

  useEffect(() => {
    if (!repoUrl) {
      router.push('/')
      return
    }

    let pollInterval

    async function startAnalysis() {
      try {
        // Start repository analysis
        const response = await apiClient.analyzeRepository(repoUrl)
        setRepositoryId(response.repositoryId)
        
        // Poll for status updates
        pollInterval = setInterval(async () => {
          try {
            const status = await apiClient.getRepositoryStatus(response.repositoryId)
            
            // Update progress
            const currentProgress = status.progress || 0
            setProgress(currentProgress)
            
            // Update current step based on progress
            const stepIndex = steps.findIndex(step => currentProgress < step.progress)
            setCurrentStep(stepIndex === -1 ? steps.length - 1 : Math.max(0, stepIndex - 1))
            
            // Check if completed
            if (status.status === 'completed' || currentProgress >= 100) {
              clearInterval(pollInterval)
              // Store repository ID in localStorage as backup
              localStorage.setItem('currentRepoId', response.repositoryId)
              setTimeout(() => {
                router.push(`/dashboard?repoId=${response.repositoryId}`)
              }, 1000)
            }
            
            // Check if failed
            if (status.status === 'failed') {
              clearInterval(pollInterval)
              setError('Analysis failed. Please try again.')
            }
          } catch (err) {
            console.error('Error polling status:', err)
          }
        }, 2000) // Poll every 2 seconds
        
      } catch (err) {
        console.error('Error starting analysis:', err)
        setError(err.message || 'Failed to start analysis')
      }
    }

    startAnalysis()

    return () => {
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [repoUrl, router])

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Analyzing Repository
          </h1>
          <p className="text-gray-400">
            {repoUrl}
          </p>
          {error && (
            <p className="text-red-400 mt-2">
              {error}
            </p>
          )}
        </div>

        {/* Empty Graph Container - Subtle evolving */}
        <div className="mb-12 h-64 bg-[#111111] border border-[#222222] rounded-lg flex items-center justify-center relative overflow-hidden">
          {/* Subtle animated gradient overlay */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              background: `linear-gradient(45deg, transparent ${progress}%, #00D9FF ${progress + 10}%, transparent ${progress + 20}%)`,
              transition: 'background 0.3s ease'
            }}
          />
          <div className="text-gray-600 text-sm">Graph visualization loading...</div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="h-1 bg-[#222222] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#00D9FF] transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 text-right text-sm text-gray-500">
            {progress}%
          </div>
        </div>

        {/* Checklist Progress */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep
            const isActive = index === currentStep
            const isPending = index > currentStep

            return (
              <div 
                key={step.id}
                className={`flex items-center gap-3 transition-all duration-300 ${
                  isActive ? 'text-white' : isCompleted ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                <span className={`text-lg ${
                  isCompleted ? 'text-[#00D9FF]' : isPending ? 'text-gray-700' : 'text-[#00D9FF]'
                }`}>
                  {isCompleted ? '✓' : isPending ? '○' : '◐'}
                </span>
                <span className={isActive ? 'font-medium' : ''}>
                  {step.label}
                  {isActive && (
                    <span className="ml-2 inline-block">
                      <span className="animate-pulse">...</span>
                    </span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function AnalyzingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    }>
      <AnalyzingContent />
    </Suspense>
  )
}

// Made with Bob
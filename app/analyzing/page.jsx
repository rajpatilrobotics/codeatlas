'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiClient } from '@/lib/api'

const PENDING_REPO_KEY = 'codeatlas_pendingRepo'

const STEPS = [
  { id: 1, label: 'Cloning repository', progress: 10 },
  { id: 2, label: 'Parsing file structure', progress: 25 },
  { id: 3, label: 'Detecting architecture', progress: 40 },
  { id: 4, label: 'Building dependency graph', progress: 60 },
  { id: 5, label: 'Running security analysis', progress: 75 },
  { id: 6, label: 'Generating AI insights', progress: 90 },
  { id: 7, label: 'Preparing onboarding workspace', progress: 100 },
]

function resolveRepoUrlFromBrowser(searchParams) {
  const q = searchParams.get('repo')
  if (q?.trim()) return q.trim()
  try {
    const s = sessionStorage.getItem(PENDING_REPO_KEY)
    if (s?.trim()) return s.trim()
  } catch {
    /* private mode */
  }
  if (typeof window !== 'undefined') {
    const fromBar = new URLSearchParams(window.location.search).get('repo')
    if (fromBar?.trim()) return fromBar.trim()
  }
  return null
}

function AnalyzingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  /** undefined = still resolving; null = missing; string = ready */
  const [resolvedRepoUrl, setResolvedRepoUrl] = useState(undefined)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState(null)
  const startedRef = useRef(false)

  // Wait a tick so useSearchParams / URL are stable (avoids instant bounce to "/")
  useEffect(() => {
    const id = window.setTimeout(() => {
      setResolvedRepoUrl(resolveRepoUrlFromBrowser(searchParams))
    }, 0)
    return () => window.clearTimeout(id)
  }, [searchParams])

  useEffect(() => {
    if (resolvedRepoUrl === undefined) return
    if (resolvedRepoUrl === null) {
      router.replace('/')
      return
    }
    if (startedRef.current) return
    startedRef.current = true

    try {
      sessionStorage.removeItem(PENDING_REPO_KEY)
    } catch {
      /* ignore */
    }

    let pollInterval

    async function startAnalysis() {
      try {
        const response = await apiClient.analyzeRepository(resolvedRepoUrl)

        pollInterval = window.setInterval(async () => {
          try {
            const status = await apiClient.getRepositoryStatus(response.repositoryId)
            const currentProgress = status.progress ?? 0
            setProgress(currentProgress)

            const stepIndex = STEPS.findIndex((step) => currentProgress < step.progress)
            setCurrentStep(stepIndex === -1 ? STEPS.length - 1 : Math.max(0, stepIndex - 1))

            if (status.status === 'failed') {
              window.clearInterval(pollInterval)
              pollInterval = undefined
              setError('Analysis failed. Please try again.')
              return
            }

            if (status.status === 'completed' || currentProgress >= 100) {
              window.clearInterval(pollInterval)
              pollInterval = undefined
              try {
                localStorage.setItem('currentRepoId', response.repositoryId)
              } catch {
                /* ignore */
              }
              window.setTimeout(() => {
                router.push(`/dashboard?repoId=${response.repositoryId}`)
              }, 1000)
            }
          } catch (err) {
            console.error('Error polling status:', err)
          }
        }, 2000)
      } catch (err) {
        console.error('Error starting analysis:', err)
        setError(err.message || 'Failed to start analysis')
      }
    }

    startAnalysis()

    return () => {
      if (pollInterval) window.clearInterval(pollInterval)
    }
  }, [resolvedRepoUrl, router])

  if (resolvedRepoUrl === undefined) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
        <div className="text-gray-400 text-sm">Starting analysis…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Analyzing Repository
          </h1>
          <p className="text-gray-400 break-all">{resolvedRepoUrl}</p>
          {error && <p className="text-red-400 mt-2">{error}</p>}
        </div>

        <div className="mb-12 h-64 bg-[#111111] border border-[#222222] rounded-lg flex items-center justify-center relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              background: `linear-gradient(45deg, transparent ${progress}%, #00D9FF ${progress + 10}%, transparent ${progress + 20}%)`,
              transition: 'background 0.3s ease',
            }}
          />
          <div className="text-gray-600 text-sm">Graph visualization loading...</div>
        </div>

        <div className="mb-8">
          <div className="h-1 bg-[#222222] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00D9FF] transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 text-right text-sm text-gray-500">{progress}%</div>
        </div>

        <div className="space-y-3">
          {STEPS.map((step, index) => {
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
                <span
                  className={`text-lg ${
                    isCompleted ? 'text-[#00D9FF]' : isPending ? 'text-gray-700' : 'text-[#00D9FF]'
                  }`}
                >
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
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
          <div className="text-gray-400">Loading...</div>
        </div>
      }
    >
      <AnalyzingContent />
    </Suspense>
  )
}

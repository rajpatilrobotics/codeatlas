'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to dashboard
    router.push('/dashboard')
  }, [router])
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-primary">
      <div className="text-center">
        <div className="mb-4">
          <div className="w-16 h-16 mx-auto border-4 border-accent-cyan border-t-transparent rounded-full animate-spin"></div>
        </div>
        <h1 className="text-4xl font-bold mb-2 text-gradient">CodeAtlas</h1>
        <p className="text-text-secondary">Loading your developer intelligence platform...</p>
      </div>
    </div>
  )
}

// Made with Bob

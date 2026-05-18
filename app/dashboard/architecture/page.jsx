'use client'

import { Suspense } from 'react'
import ArchitectureContent from './ArchitectureContent'

export default function ArchitecturePage() {
  return (
    <Suspense fallback={<div className="p-8 text-neutral-400">Loading architecture...</div>}>
      <ArchitectureContent />
    </Suspense>
  )
}

'use client'

import { Suspense } from 'react'
import RepositoryGraphContent from './RepositoryGraphContent'

export default function RepositoryGraphPage() {
  return (
    <Suspense fallback={<div className="p-8 text-neutral-400">Loading...</div>}>
      <RepositoryGraphContent />
    </Suspense>
  )
}

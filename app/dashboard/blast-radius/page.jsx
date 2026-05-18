'use client'

import { Suspense } from 'react'
import BlastRadiusContent from './BlastRadiusContent'

export default function BlastRadiusPage() {
  return (
    <Suspense fallback={<div className="p-8 text-neutral-400">Loading blast radius...</div>}>
      <BlastRadiusContent />
    </Suspense>
  )
}

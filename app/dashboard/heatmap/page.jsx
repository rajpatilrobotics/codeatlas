'use client'

import { Suspense } from 'react'
import HeatmapContent from './HeatmapContent'

export default function HeatmapPage() {
  return (
    <Suspense fallback={<div className="p-8 text-neutral-400">Loading heatmap...</div>}>
      <HeatmapContent />
    </Suspense>
  )
}

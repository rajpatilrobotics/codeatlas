'use client'

import { Suspense } from 'react'
import { useActiveRepo } from '@/hooks/useActiveRepo'

function RepoHydratorInner({ children }) {
  useActiveRepo()
  return children
}

export default function RepoHydrator({ children }) {
  return (
    <Suspense fallback={children}>
      <RepoHydratorInner>{children}</RepoHydratorInner>
    </Suspense>
  )
}

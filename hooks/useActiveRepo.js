'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { apiClient } from '@/lib/api'
import useRepoStore from '@/store/useRepoStore'

function pickBestRepo(repositories) {
  const withData = repositories.filter(
    (r) =>
      r.status === 'completed' &&
      ((r._count?.entities ?? r.entityCount ?? 0) > 0 ||
        (r._count?.files ?? r.fileCount ?? 0) > 0)
  )
  if (!withData.length) return repositories[0]
  return withData.sort((a, b) => {
    const ae = a._count?.entities ?? a.entityCount ?? 0
    const be = b._count?.entities ?? b.entityCount ?? 0
    if (be !== ae) return be - ae
    return (b._count?.files ?? b.fileCount ?? 0) - (a._count?.files ?? a.fileCount ?? 0)
  })[0]
}

/**
 * Resolves the active repository from URL ?repoId=, localStorage, or the latest analyzed repo.
 * Hydrates Zustand so every dashboard page can load data.
 */
export function useActiveRepo() {
  const searchParams = useSearchParams()
  const currentRepo = useRepoStore((s) => s.currentRepo)
  const setCurrentRepo = useRepoStore((s) => s.setCurrentRepo)
  const [resolvedRepoId, setResolvedRepoId] = useState(null)
  const [initialized, setInitialized] = useState(false)
  const [hydrating, setHydrating] = useState(false)
  const [error, setError] = useState(null)

  const repoIdFromUrl = searchParams.get('repoId')

  // Resolve repo id once: URL → localStorage → best analyzed repo from API
  useEffect(() => {
    let cancelled = false

    ;(async () => {
      let id = repoIdFromUrl

      if (!id) {
        try {
          id = localStorage.getItem('currentRepoId')
        } catch {
          id = null
        }
      }

      if (!id) {
        try {
          const result = await apiClient.listRepositories()
          const best = pickBestRepo(result.repositories || [])
          id = best?.id || null
          if (id) {
            try {
              localStorage.setItem('currentRepoId', id)
            } catch {
              /* ignore */
            }
          }
        } catch {
          /* ignore */
        }
      }

      if (!cancelled) {
        setResolvedRepoId(id)
        setInitialized(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [repoIdFromUrl])

  const repoId = useMemo(
    () => repoIdFromUrl || resolvedRepoId || currentRepo?.id || null,
    [repoIdFromUrl, resolvedRepoId, currentRepo?.id]
  )

  useEffect(() => {
    if (!initialized || !repoId) return
    if (currentRepo?.id === repoId && currentRepo?.name) return

    let cancelled = false

    ;(async () => {
      try {
        setHydrating(true)
        setError(null)
        const status = await apiClient.getRepositoryStatus(repoId)
        if (cancelled) return
        setCurrentRepo({
          id: repoId,
          name: status.name,
          owner: status.owner,
          url: status.url,
          status: status.status,
        })
        try {
          localStorage.setItem('currentRepoId', repoId)
        } catch {
          /* ignore */
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load repository')
      } finally {
        if (!cancelled) setHydrating(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [initialized, repoId, currentRepo?.id, currentRepo?.name, setCurrentRepo])

  const activeRepo =
    currentRepo?.id === repoId
      ? currentRepo
      : repoId
        ? { id: repoId, name: null, url: null, status: null }
        : null

  return {
    repoId: initialized ? repoId : null,
    currentRepo: activeRepo,
    loading: !initialized || hydrating,
    error,
    hasRepo: initialized && !!repoId,
  }
}

/** Append ?repoId= to dashboard links when a repo is active */
export function useRepoHref(path) {
  const { repoId } = useActiveRepo()
  if (!repoId) return path
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}repoId=${encodeURIComponent(repoId)}`
}

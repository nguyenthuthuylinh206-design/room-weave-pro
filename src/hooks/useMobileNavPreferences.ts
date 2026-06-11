import { useCallback, useEffect, useState } from 'react'
import { useUser } from './useUser'

const KEY_PREFIX = 'mobile-bottom-nav:v1:'
export const MAX_CUSTOM_TABS = 3

function readFromStorage(userId: string | null | undefined): string[] | null {
  if (!userId) return null
  try {
    const raw = localStorage.getItem(KEY_PREFIX + userId)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed.filter((x) => typeof x === 'string').slice(0, MAX_CUSTOM_TABS)
  } catch {
    return null
  }
}

export function useMobileNavPreferences() {
  const { user } = useUser()
  const userId = user?.id ?? null
  const [selectedIds, setSelectedIdsState] = useState<string[] | null>(() => readFromStorage(userId))

  useEffect(() => {
    setSelectedIdsState(readFromStorage(userId))
  }, [userId])

  useEffect(() => {
    if (!userId) return
    const key = KEY_PREFIX + userId
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) setSelectedIdsState(readFromStorage(userId))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [userId])

  const setSelectedIds = useCallback(
    (ids: string[]) => {
      if (!userId) return
      const trimmed = ids.slice(0, MAX_CUSTOM_TABS)
      localStorage.setItem(KEY_PREFIX + userId, JSON.stringify(trimmed))
      setSelectedIdsState(trimmed)
    },
    [userId]
  )

  const reset = useCallback(() => {
    if (!userId) return
    localStorage.removeItem(KEY_PREFIX + userId)
    setSelectedIdsState(null)
  }, [userId])

  return {
    selectedIds,
    isCustomized: selectedIds !== null,
    setSelectedIds,
    reset,
  }
}

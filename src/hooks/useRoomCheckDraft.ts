import { useEffect, useRef, useCallback } from 'react'

interface Options<T> {
  /** Key duy nhất (vd: room id + user id) */
  key: string
  /** Form data hiện tại — dùng JSON.stringify để diff */
  data: T
  /** Cho phép tắt khi điều kiện không hợp lệ (loading, đã submit...) */
  enabled?: boolean
  /** Debounce ms — mặc định 1500ms, đủ nhanh cho mobile */
  delay?: number
  /** TTL ms — bỏ draft cũ hơn ngưỡng này khi load. Mặc định 24h */
  ttlMs?: number
}

const PREFIX = 'rc-draft:'

interface DraftEnvelope<T> {
  v: 1
  savedAt: number
  data: T
}

/**
 * Autosave nhẹ vào localStorage cho RoomCheck form.
 * - Tự động bỏ draft khi user gọi `clear()` (sau khi submit thành công)
 * - Bỏ qua draft cũ > TTL
 * - Không depend vào server, không tốn network
 */
export function useRoomCheckDraft<T>({
  key,
  data,
  enabled = true,
  delay = 1500,
  ttlMs = 24 * 60 * 60 * 1000,
}: Options<T>) {
  const fullKey = `${PREFIX}${key}`
  const lastSerialized = useRef<string>('')
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const load = useCallback((): T | null => {
    try {
      const raw = localStorage.getItem(fullKey)
      if (!raw) return null
      const env = JSON.parse(raw) as DraftEnvelope<T>
      if (!env || env.v !== 1) return null
      if (Date.now() - env.savedAt > ttlMs) {
        localStorage.removeItem(fullKey)
        return null
      }
      return env.data
    } catch {
      return null
    }
  }, [fullKey, ttlMs])

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(fullKey)
    } catch {}
  }, [fullKey])

  useEffect(() => {
    if (!enabled) return
    let serialized: string
    try {
      serialized = JSON.stringify(data)
    } catch {
      return
    }
    if (serialized === lastSerialized.current) return

    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      try {
        const env: DraftEnvelope<T> = { v: 1, savedAt: Date.now(), data }
        localStorage.setItem(fullKey, JSON.stringify(env))
        lastSerialized.current = serialized
      } catch {
        // quota / private mode — bỏ qua
      }
    }, delay)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [data, enabled, delay, fullKey])

  return { load, clear }
}

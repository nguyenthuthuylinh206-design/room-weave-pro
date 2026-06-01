import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type CellSizePreset = 'sm' | 'md' | 'lg' | 'custom'

export interface CellSizeState {
  preset: CellSizePreset
  height: number // px
  cols: number  // xl breakpoint cols
  fontScale: number // 0.8 – 1.4
}

const PRESETS: Record<Exclude<CellSizePreset, 'custom'>, { height: number; cols: number }> = {
  sm: { height: 80, cols: 16 },
  md: { height: 96, cols: 12 },
  lg: { height: 128, cols: 8 },
}

const DEFAULT_FONT_SCALE = 1.0
const ALLOWED_COLS = [4, 6, 8, 10, 12, 14, 16] as const

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

function snapCols(c: number): number {
  let best = ALLOWED_COLS[0] as number
  let diff = Math.abs(c - best)
  for (const v of ALLOWED_COLS) {
    const d = Math.abs(c - v)
    if (d < diff) { diff = d; best = v }
  }
  return best
}

function storageKey(hotelId?: string | null) {
  return `rooms.floorMap.cellSize:${hotelId || 'default'}`
}

function normalize(p: Partial<CellSizeState> | null | undefined): CellSizeState {
  if (!p || typeof p.height !== 'number' || typeof p.cols !== 'number') {
    return { preset: 'md', ...PRESETS.md, fontScale: DEFAULT_FONT_SCALE }
  }
  return {
    preset: (p.preset as CellSizePreset) || 'custom',
    height: clamp(p.height, 64, 200),
    cols: snapCols(p.cols),
    fontScale: clamp(typeof p.fontScale === 'number' ? p.fontScale : DEFAULT_FONT_SCALE, 0.8, 1.6),
  }
}

function readStored(hotelId?: string | null): CellSizeState {
  try {
    const raw = localStorage.getItem(storageKey(hotelId))
    if (raw) return normalize(JSON.parse(raw))
  } catch {
    // Ignore corrupted local preferences and fall back to defaults.
  }
  return normalize(null)
}

export function useFloorMapCellSize(hotelId?: string | null, remoteInitial?: CellSizeState | null) {
  const [size, setSize] = useState<CellSizeState>(() => remoteInitial ? normalize(remoteInitial) : readStored(hotelId))
  const dirtyRef = useRef(false)
  const hotelRef = useRef(hotelId)

  // Reload when hotel changes or remote arrives. Do not let stale remote values
  // overwrite local edits while the user is adjusting before pressing Save.
  useEffect(() => {
    const hotelChanged = hotelRef.current !== hotelId
    if (hotelChanged) {
      hotelRef.current = hotelId
      dirtyRef.current = false
    }

    const next = remoteInitial ? normalize(remoteInitial) : readStored(hotelId)

    if (dirtyRef.current && !hotelChanged) return

    setSize(next)
    try { localStorage.setItem(storageKey(hotelId), JSON.stringify(next)) } catch {
      // Local persistence is best-effort.
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId, remoteInitial?.height, remoteInitial?.cols, remoteInitial?.fontScale, remoteInitial?.preset])

  // Persist localStorage (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(storageKey(hotelId), JSON.stringify(size)) } catch {
        // Local persistence is best-effort.
      }
    }, 250)
    return () => clearTimeout(t)
  }, [hotelId, size])

  const setPreset = useCallback((preset: CellSizePreset) => {
    dirtyRef.current = true
    if (preset === 'custom') {
      setSize((s) => ({ ...s, preset: 'custom' }))
    } else {
      setSize((s) => ({ preset, ...PRESETS[preset], fontScale: s.fontScale }))
    }
  }, [])

  const setCustom = useCallback((patch: Partial<Pick<CellSizeState, 'height' | 'cols' | 'fontScale'>>) => {
    dirtyRef.current = true
    setSize((s) => ({
      preset: 'custom',
      height: clamp(patch.height ?? s.height, 64, 200),
      cols: snapCols(patch.cols ?? s.cols),
      fontScale: clamp(patch.fontScale ?? s.fontScale, 0.8, 1.6),
    }))
  }, [])

  const setFontScale = useCallback((v: number) => {
    dirtyRef.current = true
    setSize((s) => ({ ...s, fontScale: clamp(v, 0.8, 1.6) }))
  }, [])

  const reset = useCallback(() => {
    dirtyRef.current = true
    setSize({ preset: 'md', ...PRESETS.md, fontScale: DEFAULT_FONT_SCALE })
  }, [])

  const markSynced = useCallback((value?: CellSizeState) => {
    dirtyRef.current = false
    const next = normalize(value ?? size)
    setSize(next)
    try { localStorage.setItem(storageKey(hotelId), JSON.stringify(next)) } catch {
      // Local persistence is best-effort.
    }
  }, [hotelId, size])

  // Keyboard shortcut: Ctrl/Cmd +/-/0
  useEffect(() => {
    const order: CellSizePreset[] = ['sm', 'md', 'lg']
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === '0') {
        e.preventDefault()
        dirtyRef.current = true
        setSize((s) => ({ preset: 'md', ...PRESETS.md, fontScale: s.fontScale }))
      } else if (e.key === '=' || e.key === '+') {
        e.preventDefault()
        setSize((s) => {
          const idx = order.indexOf(s.preset)
          const nextIdx = idx === -1 ? order.indexOf('md') : Math.min(order.length - 1, idx + 1)
          const p = order[nextIdx]
          dirtyRef.current = true
          return { preset: p, ...PRESETS[p as 'sm'|'md'|'lg'], fontScale: s.fontScale }
        })
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        setSize((s) => {
          const idx = order.indexOf(s.preset)
          const nextIdx = idx === -1 ? order.indexOf('md') : Math.max(0, idx - 1)
          const p = order[nextIdx]
          dirtyRef.current = true
          return { preset: p, ...PRESETS[p as 'sm'|'md'|'lg'], fontScale: s.fontScale }
        })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const classes = useMemo(() => {
    const minCellPx = Math.max(72, Math.round(size.height * 0.85))
    const targetMin = Math.round(minCellPx * (12 / Math.max(4, size.cols)))
    const gridStyle: React.CSSProperties = {
      gridTemplateColumns: `repeat(auto-fill, minmax(${targetMin}px, 1fr))`,
    }

    // Effective height tính cả fontScale → cỡ chữ co giãn độc lập
    const h = size.height * size.fontScale
    const numberCls = h >= 140 ? 'text-3xl' : h >= 115 ? 'text-2xl' : h >= 95 ? 'text-xl' : h >= 78 ? 'text-base' : 'text-sm'
    const bodyCls = h >= 140 ? 'text-base' : h >= 115 ? 'text-sm' : h >= 95 ? 'text-[13px]' : h >= 78 ? 'text-[12px]' : 'text-[11px]'
    const captionCls = h >= 140 ? 'text-[13px]' : h >= 115 ? 'text-[12px]' : h >= 95 ? 'text-[11px]' : h >= 78 ? 'text-[10px]' : 'text-[9px]'
    const badgeCls = h >= 115 ? 'text-[11px]' : h >= 95 ? 'text-[10px]' : 'text-[9px]'
    const labelCls = captionCls
    const dotPx = h >= 130 ? 'h-6 w-6' : h >= 95 ? 'h-5 w-5' : 'h-4 w-4'

    return { gridStyle, numberCls, bodyCls, captionCls, badgeCls, labelCls, dotPx }
  }, [size])

  const summaryLabel = useMemo(() => {
    const name = size.preset === 'sm' ? 'Nhỏ' : size.preset === 'lg' ? 'Lớn' : size.preset === 'md' ? 'Vừa' : 'Tuỳ chỉnh'
    return `${name} · ${size.cols} cột · ${Math.round(size.fontScale * 100)}%`
  }, [size])

  return { size, setPreset, setCustom, setFontScale, reset, markSynced, classes, summaryLabel, allowedCols: ALLOWED_COLS as readonly number[] }
}

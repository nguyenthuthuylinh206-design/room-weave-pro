import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type CellSizePreset = 'sm' | 'md' | 'lg' | 'custom'

export interface CellSizeState {
  preset: CellSizePreset
  height: number // px
  cols: number  // xl breakpoint cols
  fontScale: number // 0.8 – 1.4
}

export const FLOOR_MAP_CELL_SIZE_PRESETS: Record<Exclude<CellSizePreset, 'custom'>, { height: number; cols: number }> = {
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

export function floorMapCellSizeStorageKey(hotelId?: string | null) {
  return `rooms.floorMap.cellSize:${hotelId || 'default'}`
}

export function normalizeCellSize(p: Partial<CellSizeState> | null | undefined): CellSizeState {
  if (!p || typeof p.height !== 'number' || typeof p.cols !== 'number') {
    return { preset: 'md', ...FLOOR_MAP_CELL_SIZE_PRESETS.md, fontScale: DEFAULT_FONT_SCALE }
  }
  return {
    preset: (p.preset as CellSizePreset) || 'custom',
    height: clamp(p.height, 64, 200),
    cols: snapCols(p.cols),
    fontScale: clamp(typeof p.fontScale === 'number' ? p.fontScale : DEFAULT_FONT_SCALE, 0.8, 1.6),
  }
}

export function getPresetCellSize(preset: Exclude<CellSizePreset, 'custom'>, fontScale = DEFAULT_FONT_SCALE): CellSizeState {
  return normalizeCellSize({ preset, ...FLOOR_MAP_CELL_SIZE_PRESETS[preset], fontScale })
}

function readStored(hotelId?: string | null): CellSizeState {
  try {
    const raw = localStorage.getItem(floorMapCellSizeStorageKey(hotelId))
    if (raw) return normalizeCellSize(JSON.parse(raw))
  } catch {
    // Ignore corrupted local preferences and fall back to defaults.
  }
  return normalizeCellSize(null)
}

export function cellSizeSignature(value: CellSizeState): string {
  return JSON.stringify(normalizeCellSize(value))
}

export function useFloorMapCellSize(hotelId?: string | null, remoteInitial?: CellSizeState | null) {
  const initialSize = remoteInitial ? normalize(remoteInitial) : readStored(hotelId)
  const [size, setSize] = useState<CellSizeState>(() => initialSize)
  const [savedSize, setSavedSize] = useState<CellSizeState>(() => initialSize)
  const [isDirty, setIsDirty] = useState(false)
  const sizeRef = useRef(size)
  const savedSizeRef = useRef(savedSize)
  const isDirtyRef = useRef(false)
  const hotelRef = useRef(hotelId)

  useEffect(() => {
    sizeRef.current = size
  }, [size])

  useEffect(() => {
    savedSizeRef.current = savedSize
  }, [savedSize])

  const applySaved = useCallback((next: CellSizeState) => {
    const normalized = normalize(next)
    sizeRef.current = normalized
    savedSizeRef.current = normalized
    isDirtyRef.current = false
    setSize(normalized)
    setSavedSize(normalized)
    setIsDirty(false)
    try { localStorage.setItem(storageKey(hotelId), JSON.stringify(normalized)) } catch {
      // Local persistence is best-effort.
    }
  }, [hotelId])

  const applyDraft = useCallback((next: CellSizeState) => {
    const normalized = normalize(next)
    const dirty = signature(normalized) !== signature(savedSizeRef.current)
    sizeRef.current = normalized
    isDirtyRef.current = dirty
    setSize(normalized)
    setIsDirty(dirty)
  }, [])

  // Reload when hotel changes or remote arrives. Do not let stale remote values
  // overwrite local edits while the user is adjusting before pressing Save.
  useEffect(() => {
    const hotelChanged = hotelRef.current !== hotelId
    if (hotelChanged) {
      hotelRef.current = hotelId
    }

    if (!remoteInitial) {
      if (hotelChanged) {
        applySaved(readStored(hotelId))
      }
      return
    }

    const next = normalize(remoteInitial)
    if (!isDirtyRef.current || hotelChanged) applySaved(next)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applySaved, hotelId, remoteInitial?.height, remoteInitial?.cols, remoteInitial?.fontScale, remoteInitial?.preset])

  const setPreset = useCallback((preset: CellSizePreset) => {
    const current = sizeRef.current
    applyDraft(preset === 'custom'
      ? { ...current, preset: 'custom' }
      : { preset, ...PRESETS[preset], fontScale: current.fontScale })
  }, [applyDraft])

  const setCustom = useCallback((patch: Partial<Pick<CellSizeState, 'height' | 'cols' | 'fontScale'>>) => {
    const current = sizeRef.current
    applyDraft({
      preset: 'custom',
      height: clamp(patch.height ?? current.height, 64, 200),
      cols: snapCols(patch.cols ?? current.cols),
      fontScale: clamp(patch.fontScale ?? current.fontScale, 0.8, 1.6),
    })
  }, [applyDraft])

  const setFontScale = useCallback((v: number) => {
    applyDraft({ ...sizeRef.current, fontScale: clamp(v, 0.8, 1.6) })
  }, [applyDraft])

  const reset = useCallback(() => {
    applyDraft({ preset: 'md', ...PRESETS.md, fontScale: DEFAULT_FONT_SCALE })
  }, [applyDraft])

  const markSynced = useCallback((value?: CellSizeState) => {
    applySaved(value ?? sizeRef.current)
  }, [applySaved])

  const discardDraft = useCallback(() => {
    applySaved(savedSizeRef.current)
  }, [applySaved])

  const getCurrentSize = useCallback(() => sizeRef.current, [])

  // Keyboard shortcut: Ctrl/Cmd +/-/0
  useEffect(() => {
    const order: CellSizePreset[] = ['sm', 'md', 'lg']
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === '0') {
        e.preventDefault()
        const current = sizeRef.current
        applyDraft({ preset: 'md', ...PRESETS.md, fontScale: current.fontScale })
      } else if (e.key === '=' || e.key === '+') {
        e.preventDefault()
        const current = sizeRef.current
        const idx = order.indexOf(current.preset)
        const nextIdx = idx === -1 ? order.indexOf('md') : Math.min(order.length - 1, idx + 1)
        const p = order[nextIdx]
        applyDraft({ preset: p, ...PRESETS[p as 'sm'|'md'|'lg'], fontScale: current.fontScale })
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        const current = sizeRef.current
        const idx = order.indexOf(current.preset)
        const nextIdx = idx === -1 ? order.indexOf('md') : Math.max(0, idx - 1)
        const p = order[nextIdx]
        applyDraft({ preset: p, ...PRESETS[p as 'sm'|'md'|'lg'], fontScale: current.fontScale })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [applyDraft])

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

  return { size, savedSize, isDirty, setPreset, setCustom, setFontScale, reset, markSynced, discardDraft, getCurrentSize, classes, summaryLabel, allowedCols: ALLOWED_COLS as readonly number[] }
}

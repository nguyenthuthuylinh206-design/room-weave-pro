import { useCallback, useEffect, useMemo, useState } from 'react'

export type CellSizePreset = 'sm' | 'md' | 'lg' | 'custom'

export interface CellSizeState {
  preset: CellSizePreset
  height: number // px
  cols: number  // xl breakpoint cols
}

const PRESETS: Record<Exclude<CellSizePreset, 'custom'>, { height: number; cols: number }> = {
  sm: { height: 80, cols: 16 },
  md: { height: 96, cols: 12 },
  lg: { height: 128, cols: 8 },
}

const ALLOWED_COLS = [4, 6, 8, 10, 12, 14, 16] as const

// Safelist Tailwind classes (must be static for purge)
const XL_COLS: Record<number, string> = {
  4: 'xl:grid-cols-4',
  6: 'xl:grid-cols-6',
  8: 'xl:grid-cols-8',
  10: 'xl:grid-cols-10',
  12: 'xl:grid-cols-12',
  14: 'xl:grid-cols-14',
  16: 'xl:grid-cols-16',
}
const LG_COLS: Record<number, string> = {
  3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5', 6: 'lg:grid-cols-6',
  7: 'lg:grid-cols-7', 8: 'lg:grid-cols-8', 9: 'lg:grid-cols-9', 10: 'lg:grid-cols-10',
  11: 'lg:grid-cols-11', 12: 'lg:grid-cols-12',
}
const MD_COLS: Record<number, string> = {
  3: 'md:grid-cols-3', 4: 'md:grid-cols-4', 5: 'md:grid-cols-5', 6: 'md:grid-cols-6',
  7: 'md:grid-cols-7', 8: 'md:grid-cols-8', 9: 'md:grid-cols-9', 10: 'md:grid-cols-10',
}
const SM_COLS: Record<number, string> = {
  3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4', 5: 'sm:grid-cols-5', 6: 'sm:grid-cols-6',
  7: 'sm:grid-cols-7', 8: 'sm:grid-cols-8',
}

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

function readStored(hotelId?: string | null): CellSizeState {
  try {
    const raw = localStorage.getItem(storageKey(hotelId))
    if (raw) {
      const p = JSON.parse(raw) as CellSizeState
      if (p && typeof p.height === 'number' && typeof p.cols === 'number') {
        return {
          preset: p.preset || 'custom',
          height: clamp(p.height, 64, 180),
          cols: snapCols(p.cols),
        }
      }
    }
  } catch {}
  return { preset: 'md', ...PRESETS.md }
}

export function useFloorMapCellSize(hotelId?: string | null) {
  const [size, setSize] = useState<CellSizeState>(() => readStored(hotelId))

  // Reload when hotel changes
  useEffect(() => {
    setSize(readStored(hotelId))
  }, [hotelId])

  // Persist (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(storageKey(hotelId), JSON.stringify(size)) } catch {}
    }, 250)
    return () => clearTimeout(t)
  }, [hotelId, size])

  const setPreset = useCallback((preset: CellSizePreset) => {
    if (preset === 'custom') {
      setSize((s) => ({ ...s, preset: 'custom' }))
    } else {
      setSize({ preset, ...PRESETS[preset] })
    }
  }, [])

  const setCustom = useCallback((patch: Partial<Pick<CellSizeState, 'height' | 'cols'>>) => {
    setSize((s) => ({
      preset: 'custom',
      height: clamp(patch.height ?? s.height, 64, 180),
      cols: snapCols(patch.cols ?? s.cols),
    }))
  }, [])

  // Keyboard shortcut: Ctrl/Cmd +/-/0
  useEffect(() => {
    const order: CellSizePreset[] = ['sm', 'md', 'lg']
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === '0') {
        e.preventDefault()
        setPreset('md')
      } else if (e.key === '=' || e.key === '+') {
        e.preventDefault()
        setSize((s) => {
          const idx = order.indexOf(s.preset as any)
          // bigger = fewer cols & taller. lg > md > sm
          const nextIdx = idx === -1 ? order.indexOf('md') : Math.min(order.length - 1, idx + 1)
          const p = order[nextIdx]
          return { preset: p, ...PRESETS[p as 'sm'|'md'|'lg'] }
        })
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        setSize((s) => {
          const idx = order.indexOf(s.preset as any)
          const nextIdx = idx === -1 ? order.indexOf('md') : Math.max(0, idx - 1)
          const p = order[nextIdx]
          return { preset: p, ...PRESETS[p as 'sm'|'md'|'lg'] }
        })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setPreset])

  const classes = useMemo(() => {
    // Min cell width tỉ lệ chiều cao (ô vuông-ish). Cell càng cao càng rộng.
    const minCellPx = Math.max(72, Math.round(size.height * 0.85))
    // auto-fill + minmax: tự co giãn theo container, ô càng to → cột càng ít. Cols slider gián
    // tiếp ảnh hưởng qua việc tăng/giảm minCellPx nhẹ để gần với mục tiêu của user.
    const targetMin = Math.round(minCellPx * (12 / Math.max(4, size.cols)))
    const gridStyle: React.CSSProperties = {
      gridTemplateColumns: `repeat(auto-fill, minmax(${targetMin}px, 1fr))`,
    }

    // Font scale theo chiều cao ô
    const h = size.height
    const numberCls = h >= 130 ? 'text-3xl' : h >= 110 ? 'text-2xl' : h >= 90 ? 'text-xl' : h >= 76 ? 'text-base' : 'text-sm'
    const bodyCls = h >= 130 ? 'text-sm' : h >= 110 ? 'text-[13px]' : h >= 90 ? 'text-[12px]' : 'text-[11px]'
    const captionCls = h >= 130 ? 'text-[12px]' : h >= 110 ? 'text-[11px]' : h >= 90 ? 'text-[10px]' : 'text-[9px]'
    const badgeCls = h >= 110 ? 'text-[11px]' : h >= 90 ? 'text-[10px]' : 'text-[9px]'
    const labelCls = captionCls
    const dotPx = h >= 120 ? 'h-6 w-6' : h >= 90 ? 'h-5 w-5' : 'h-4 w-4'

    return { gridStyle, numberCls, bodyCls, captionCls, badgeCls, labelCls, dotPx }
  }, [size])

  const summaryLabel = useMemo(() => {
    const name = size.preset === 'sm' ? 'Nhỏ' : size.preset === 'lg' ? 'Lớn' : size.preset === 'md' ? 'Vừa' : 'Tuỳ chỉnh'
    return `${name} · ${size.cols} cột`
  }, [size])

  return { size, setPreset, setCustom, classes, summaryLabel, allowedCols: ALLOWED_COLS as readonly number[] }
}

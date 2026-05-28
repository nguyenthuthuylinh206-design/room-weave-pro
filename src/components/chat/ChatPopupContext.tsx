import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react'

export interface PopupState {
  conversationId: string
  minimized: boolean
}

interface ChatPopupCtx {
  popups: PopupState[]
  openPopup: (conversationId: string) => void
  closePopup: (conversationId: string) => void
  toggleMinimize: (conversationId: string) => void
}

const MAX_POPUPS = 3

const Ctx = createContext<ChatPopupCtx | null>(null)

export function ChatPopupProvider({ children }: { children: ReactNode }) {
  const [popups, setPopups] = useState<PopupState[]>([])

  const openPopup = useCallback((conversationId: string) => {
    setPopups((prev) => {
      const existing = prev.find((p) => p.conversationId === conversationId)
      if (existing) {
        // bring to front + expand
        return [
          { conversationId, minimized: false },
          ...prev.filter((p) => p.conversationId !== conversationId),
        ]
      }
      const next = [{ conversationId, minimized: false }, ...prev]
      return next.slice(0, MAX_POPUPS)
    })
  }, [])

  const closePopup = useCallback((conversationId: string) => {
    setPopups((prev) => prev.filter((p) => p.conversationId !== conversationId))
  }, [])

  const toggleMinimize = useCallback((conversationId: string) => {
    setPopups((prev) =>
      prev.map((p) =>
        p.conversationId === conversationId ? { ...p, minimized: !p.minimized } : p
      )
    )
  }, [])

  const value = useMemo(
    () => ({ popups, openPopup, closePopup, toggleMinimize }),
    [popups, openPopup, closePopup, toggleMinimize]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useChatPopups() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useChatPopups must be used within ChatPopupProvider')
  return ctx
}

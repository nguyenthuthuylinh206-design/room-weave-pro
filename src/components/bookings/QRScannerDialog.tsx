import { useEffect, useRef, useCallback, useState } from 'react'
import { X, ZoomIn, Loader2, Flashlight, FlashlightOff } from 'lucide-react'
import { parseCCCDQR } from '@/lib/parseCCCDQR'
import { ScannedDocumentData } from './DocumentScanner'
import { toast } from 'sonner'

interface QRScannerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScanSuccess: (data: ScannedDocumentData) => void
}

const SCAN_INTERVAL_MS = 200
const FRAMES_BEFORE_ZOOM = 15
const ZOOM_DURATION_FRAMES = 15
const SCAN_CANVAS_WIDTH = 1280
const SCAN_CANVAS_HEIGHT = 720

export function QRScannerDialog({ open, onOpenChange, onScanSuccess }: QRScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const scanLoopRef = useRef<number | null>(null)
  const failCountRef = useRef(0)
  const zoomFrameCountRef = useRef(0)
  const isZoomedRef = useRef(false)
  const stoppedRef = useRef(false)

  const [isLoading, setIsLoading] = useState(true)
  const [isZoomed, setIsZoomed] = useState(false)
  const [isFlashOn, setIsFlashOn] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)

  const stopScanner = useCallback(() => {
    stoppedRef.current = true
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current)
      scanLoopRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const handleClose = useCallback(() => {
    stopScanner()
    onOpenChange(false)
  }, [stopScanner, onOpenChange])

  const applyZoom = useCallback(async (zoom: number) => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return false
    try {
      const caps = (track as any).getCapabilities?.()
      if (caps?.zoom) {
        const clampedZoom = Math.min(zoom, caps.zoom.max)
        await track.applyConstraints({ advanced: [{ zoom: clampedZoom } as any] })
        return true
      }
    } catch { /* ignore */ }
    return false
  }, [])

  const toggleFlash = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    try {
      const newState = !isFlashOn
      await track.applyConstraints({ advanced: [{ torch: newState } as any] })
      setIsFlashOn(newState)
    } catch { /* ignore */ }
  }, [isFlashOn])

  useEffect(() => {
    if (!open) return

    stoppedRef.current = false
    failCountRef.current = 0
    zoomFrameCountRef.current = 0
    isZoomedRef.current = false
    setIsLoading(true)
    setIsZoomed(false)
    setIsFlashOn(false)
    setHasTorch(false)

    let scanModule: { scan: (source: HTMLCanvasElement) => Promise<{ text: string } | null>, ready: () => Promise<void> } | null = null

    const canvas = document.createElement('canvas')
    canvas.width = SCAN_CANVAS_WIDTH
    canvas.height = SCAN_CANVAS_HEIGHT
    canvasRef.current = canvas
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!

    const startScanning = async () => {
      try {
        const mod = await import('qr-scanner-wechat')
        scanModule = mod
        await mod.ready()

        if (stoppedRef.current) return

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: 'environment',
            width: { ideal: 4096 },
            height: { ideal: 2160 },
            // @ts-ignore
            focusMode: { ideal: 'continuous' },
            advanced: [{ focusMode: 'continuous' } as any],
          },
        })

        if (stoppedRef.current) {
          stream.getTracks().forEach(t => t.stop())
          return
        }

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        const track = stream.getVideoTracks()[0]
        if (track) {
          try {
            const caps = (track as any).getCapabilities?.()
            if (caps?.focusMode?.includes('continuous')) {
              await track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as any] })
            }
            if (caps?.torch) {
              setHasTorch(true)
            }
          } catch { /* ignore */ }
        }

        setIsLoading(false)

        let lastScanTime = 0

        const scanFrame = async (timestamp: number) => {
          if (stoppedRef.current) return
          scanLoopRef.current = requestAnimationFrame(scanFrame)
          if (timestamp - lastScanTime < SCAN_INTERVAL_MS) return
          lastScanTime = timestamp

          const video = videoRef.current
          if (!video || !scanModule || video.readyState < 2) return

          ctx.drawImage(video, 0, 0, SCAN_CANVAS_WIDTH, SCAN_CANVAS_HEIGHT)

          try {
            const result = await scanModule.scan(canvas)
            if (stoppedRef.current) return

            if (result?.text) {
              const parsed = parseCCCDQR(result.text)
              if (parsed) {
                await applyZoom(1)
                toast.success('Đã đọc QR CCCD thành công')
                onScanSuccess(parsed)
                handleClose()
                return
              } else {
                toast.error('QR không phải định dạng CCCD')
              }
              failCountRef.current = 0
              if (isZoomedRef.current) {
                await applyZoom(1)
                isZoomedRef.current = false
                setIsZoomed(false)
              }
            } else {
              failCountRef.current++
              if (isZoomedRef.current) {
                zoomFrameCountRef.current++
                if (zoomFrameCountRef.current >= ZOOM_DURATION_FRAMES) {
                  await applyZoom(1)
                  isZoomedRef.current = false
                  setIsZoomed(false)
                  failCountRef.current = 0
                  zoomFrameCountRef.current = 0
                }
              } else if (failCountRef.current >= FRAMES_BEFORE_ZOOM) {
                const zoomed = await applyZoom(2)
                if (zoomed) {
                  isZoomedRef.current = true
                  setIsZoomed(true)
                  zoomFrameCountRef.current = 0
                }
                failCountRef.current = 0
              }
            }
          } catch {
            // Scan error, continue
          }
        }

        scanLoopRef.current = requestAnimationFrame(scanFrame)
      } catch (err: any) {
        console.error('QR scanner error:', err)
        toast.error('Không thể mở camera')
        handleClose()
      }
    }

    startScanning()
    return () => { stopScanner() }
  }, [open, onScanSuccess, handleClose, stopScanner, applyZoom])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-[102]">
          <Loader2 className="h-8 w-8 animate-spin text-white mb-3" />
          <p className="text-white text-sm">Đang khởi tạo camera...</p>
        </div>
      )}

      {/* Scan overlay */}
      {!isLoading && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Rectangular mask - 4 dark panels around scan area */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Scan box reference */}
            <div className="relative" style={{ width: '56vmin', height: '56vmin' }}>
              {/* Top overlay */}
              <div className="absolute bottom-full left-[-50vw] right-[-50vw] top-[-50vh] bg-black/50" />
              {/* Bottom overlay */}
              <div className="absolute top-full left-[-50vw] right-[-50vw] bottom-[-50vh] bg-black/50" />
              {/* Left overlay */}
              <div className="absolute top-0 bottom-0 right-full left-[-50vw] bg-black/50" />
              {/* Right overlay */}
              <div className="absolute top-0 bottom-0 left-full right-[-50vw] bg-black/50" />

              {/* Border around scan area */}
              <div className="absolute inset-0 border border-white/20 rounded-sm" />

              {/* Corner markers */}
              <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-white rounded-tl-sm" />
              <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-white rounded-tr-sm" />
              <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-white rounded-bl-sm" />
              <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-white rounded-br-sm" />

              {/* Scan line */}
              <div className="absolute left-1 right-1 h-[1px] bg-gradient-to-r from-transparent via-white/60 to-transparent animate-qr-scan" />
            </div>
          </div>

          {/* Zoom indicator */}
          {isZoomed && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/50 px-3 py-1 rounded-full">
              <ZoomIn className="h-3.5 w-3.5 text-white/80" />
              <span className="text-white/80 text-xs">2x</span>
            </div>
          )}

          {/* Guide text */}
          <div className="absolute bottom-28 left-0 right-0 text-center">
            <p className="text-white/80 text-[11px]">Hướng camera vào mã QR</p>
          </div>
        </div>
      )}

      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 z-[101] w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Flash toggle */}
      {hasTorch && !isLoading && (
        <button
          type="button"
          onClick={toggleFlash}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[101] w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white"
        >
          {isFlashOn ? <FlashlightOff className="h-5 w-5" /> : <Flashlight className="h-5 w-5" />}
        </button>
      )}
    </div>
  )
}

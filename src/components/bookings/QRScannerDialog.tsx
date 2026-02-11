import { useEffect, useRef, useCallback, useState } from 'react'
import { X, ZoomIn, Loader2 } from 'lucide-react'
import { parseCCCDQR } from '@/lib/parseCCCDQR'
import { ScannedDocumentData } from './DocumentScanner'
import { toast } from 'sonner'

interface QRScannerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScanSuccess: (data: ScannedDocumentData) => void
}

const SCAN_INTERVAL_MS = 200
const FRAMES_BEFORE_ZOOM = 15 // ~3 seconds
const ZOOM_DURATION_FRAMES = 15 // ~3 seconds at zoom
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

  useEffect(() => {
    if (!open) return

    stoppedRef.current = false
    failCountRef.current = 0
    zoomFrameCountRef.current = 0
    isZoomedRef.current = false
    setIsLoading(true)
    setIsZoomed(false)

    let scanModule: { scan: (source: HTMLCanvasElement) => Promise<{ text: string } | null>, ready: () => Promise<void> } | null = null

    const canvas = document.createElement('canvas')
    canvas.width = SCAN_CANVAS_WIDTH
    canvas.height = SCAN_CANVAS_HEIGHT
    canvasRef.current = canvas
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!

    const startScanning = async () => {
      try {
        // Load WeChat scanner module
        const mod = await import('qr-scanner-wechat')
        scanModule = mod

        // Preload WASM
        await mod.ready()

        if (stoppedRef.current) return

        // Open camera
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
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

        // Apply continuous autofocus
        const track = stream.getVideoTracks()[0]
        if (track) {
          try {
            const caps = (track as any).getCapabilities?.()
            if (caps?.focusMode?.includes('continuous')) {
              await track.applyConstraints({
                advanced: [{ focusMode: 'continuous' } as any],
              })
            }
          } catch { /* ignore */ }
        }

        setIsLoading(false)

        // Start scan loop
        let lastScanTime = 0

        const scanFrame = async (timestamp: number) => {
          if (stoppedRef.current) return

          scanLoopRef.current = requestAnimationFrame(scanFrame)

          if (timestamp - lastScanTime < SCAN_INTERVAL_MS) return
          lastScanTime = timestamp

          const video = videoRef.current
          if (!video || !scanModule || video.readyState < 2) return

          // Draw video frame to scan canvas (downscaled to 720p)
          ctx.drawImage(video, 0, 0, SCAN_CANVAS_WIDTH, SCAN_CANVAS_HEIGHT)

          try {
            const result = await scanModule.scan(canvas)

            if (stoppedRef.current) return

            if (result?.text) {
              const parsed = parseCCCDQR(result.text)
              if (parsed) {
                // Reset zoom before closing
                await applyZoom(1)
                toast.success('Đã đọc QR CCCD thành công')
                onScanSuccess(parsed)
                handleClose()
                return
              } else {
                toast.error('QR không phải định dạng CCCD')
              }
              // Reset counters on any detection
              failCountRef.current = 0
              if (isZoomedRef.current) {
                await applyZoom(1)
                isZoomedRef.current = false
                setIsZoomed(false)
              }
            } else {
              // No QR detected
              failCountRef.current++

              if (isZoomedRef.current) {
                zoomFrameCountRef.current++
                if (zoomFrameCountRef.current >= ZOOM_DURATION_FRAMES) {
                  // Zoom timeout, reset
                  await applyZoom(1)
                  isZoomedRef.current = false
                  setIsZoomed(false)
                  failCountRef.current = 0
                  zoomFrameCountRef.current = 0
                }
              } else if (failCountRef.current >= FRAMES_BEFORE_ZOOM) {
                // Try zooming in
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

    return () => {
      stopScanner()
    }
  }, [open, onScanSuccess, handleClose, stopScanner, applyZoom])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      {/* Camera feed */}
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

      {/* Overlay with transparent center */}
      {!isLoading && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Semi-transparent edges */}
          <div className="absolute inset-0 bg-black/50" style={{
            maskImage: 'radial-gradient(circle at center, transparent 30%, black 31%)',
            WebkitMaskImage: 'radial-gradient(circle at center, transparent 30%, black 31%)',
          }} />

          {/* Corner markers */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: '70vmin', height: '70vmin' }}>
            <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-green-400 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-green-400 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-green-400 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-green-400 rounded-br-lg" />

            {/* Scan line animation */}
            <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-qr-scan" />
          </div>

          {/* Zoom indicator */}
          {isZoomed && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-full">
              <ZoomIn className="h-3.5 w-3.5 text-yellow-400" />
              <span className="text-yellow-400 text-xs font-medium">2x Zoom</span>
            </div>
          )}

          {/* Guide text */}
          <div className="absolute bottom-24 left-0 right-0 text-center">
            <p className="text-white text-sm font-medium drop-shadow-lg">
              Hướng camera vào mã QR
            </p>
            <p className="text-white/60 text-xs mt-1">
              Tự động nhận diện mã QR trong khung hình
            </p>
          </div>
        </div>
      )}

      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 z-[101] w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white pointer-events-auto"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  )
}

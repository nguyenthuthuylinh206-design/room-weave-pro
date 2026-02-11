import { useEffect, useRef, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { X } from 'lucide-react'
import { parseCCCDQR } from '@/lib/parseCCCDQR'
import { ScannedDocumentData } from './DocumentScanner'
import { toast } from 'sonner'

interface QRScannerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScanSuccess: (data: ScannedDocumentData) => void
}

export function QRScannerDialog({ open, onOpenChange, onScanSuccess }: QRScannerDialogProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const readerElId = 'qr-reader-fullscreen'

  const stopScanner = useCallback(async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop()
      }
      scannerRef.current?.clear()
    } catch {
      // ignore
    }
    scannerRef.current = null

    // Stop custom stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  const handleClose = useCallback(() => {
    stopScanner()
    onOpenChange(false)
  }, [stopScanner, onOpenChange])

  useEffect(() => {
    if (!open) return

    const timeout = setTimeout(async () => {
      try {
        // Step 1: Get high-res stream with autofocus
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 4096 },
            height: { ideal: 2160 },
            // @ts-ignore - focusMode is valid but not in TS types
            focusMode: { ideal: 'continuous' },
            advanced: [
              // @ts-ignore
              { focusMode: 'continuous' },
              { torch: false } as any,
            ],
          } as any,
        })
        streamRef.current = stream

        // Step 2: Apply continuous autofocus explicitly
        const track = stream.getVideoTracks()[0]
        try {
          const capabilities = (track as any).getCapabilities?.()
          if (capabilities?.focusMode?.includes('continuous')) {
            await track.applyConstraints({
              advanced: [{ focusMode: 'continuous' } as any],
            })
          }
        } catch {
          // Some browsers don't support getCapabilities
        }

        // Step 3: Get deviceId from the stream
        const deviceId = track.getSettings().deviceId

        // Stop the stream - html5-qrcode will open its own
        stream.getTracks().forEach(t => t.stop())
        streamRef.current = null

        const scanner = new Html5Qrcode(readerElId)
        scannerRef.current = scanner

        await scanner.start(
          { deviceId: { exact: deviceId! } },
          {
            fps: 30,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.75
              return { width: Math.floor(size), height: Math.floor(size) }
            },
            aspectRatio: 1.0,
            disableFlip: false,
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true,
            },
          } as any,
          (decodedText) => {
            const parsed = parseCCCDQR(decodedText)
            if (parsed) {
              toast.success('Đã đọc QR CCCD thành công')
              onScanSuccess(parsed)
              handleClose()
            } else {
              toast.error('QR không phải định dạng CCCD')
            }
          },
          () => { /* ignore scan failures */ }
        )

        // Step 4: Apply autofocus to the scanner's own video track
        const videoEl = document.querySelector(`#${readerElId} video`) as HTMLVideoElement | null
        if (videoEl?.srcObject) {
          const scanTrack = (videoEl.srcObject as MediaStream).getVideoTracks()[0]
          if (scanTrack) {
            try {
              const caps = (scanTrack as any).getCapabilities?.()
              if (caps?.focusMode?.includes('continuous')) {
                await scanTrack.applyConstraints({
                  advanced: [{ focusMode: 'continuous' } as any],
                })
              }
            } catch {
              // ignore
            }
          }
        }
      } catch (err: any) {
        console.error('QR scanner error:', err)
        toast.error('Không thể mở camera')
        handleClose()
      }
    }, 300)

    return () => {
      clearTimeout(timeout)
      stopScanner()
    }
  }, [open, onScanSuccess, handleClose, stopScanner])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      {/* Camera feed */}
      <div id={readerElId} className="w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full [&_video]:-scale-x-100" />

      {/* Overlay with transparent center */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Semi-transparent edges */}
        <div className="absolute inset-0 bg-black/50" style={{
          maskImage: 'radial-gradient(circle at center, transparent 30%, black 31%)',
          WebkitMaskImage: 'radial-gradient(circle at center, transparent 30%, black 31%)',
        }} />

        {/* Corner markers */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: '70vmin', height: '70vmin' }}>
          {/* Top-left */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-green-400 rounded-tl-lg" />
          {/* Top-right */}
          <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-green-400 rounded-tr-lg" />
          {/* Bottom-left */}
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-green-400 rounded-bl-lg" />
          {/* Bottom-right */}
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-green-400 rounded-br-lg" />

          {/* Scan line animation */}
          <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-qr-scan" />
        </div>

        {/* Guide text */}
        <div className="absolute bottom-24 left-0 right-0 text-center">
          <p className="text-white text-sm font-medium drop-shadow-lg">
            Di chuyển camera đến mã QR
          </p>
          <p className="text-white/60 text-xs mt-1">
            Đặt mã QR trên CCCD vào khung hình
          </p>
        </div>
      </div>

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

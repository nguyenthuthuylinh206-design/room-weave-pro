import { useEffect, useRef, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  const readerElId = 'qr-reader'

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
  }, [])

  useEffect(() => {
    if (!open) return

    // Small delay to let the dialog DOM render
    const timeout = setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode(readerElId)
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            const parsed = parseCCCDQR(decodedText)
            if (parsed) {
              toast.success('Đã đọc QR CCCD thành công')
              onScanSuccess(parsed)
              onOpenChange(false)
            } else {
              toast.error('QR không phải định dạng CCCD')
            }
          },
          () => { /* ignore scan failures */ }
        )
      } catch (err: any) {
        console.error('QR scanner error:', err)
        toast.error('Không thể mở camera')
        onOpenChange(false)
      }
    }, 300)

    return () => {
      clearTimeout(timeout)
      stopScanner()
    }
  }, [open, onOpenChange, onScanSuccess, stopScanner])

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) stopScanner(); onOpenChange(v) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quét QR trên CCCD</DialogTitle>
        </DialogHeader>
        <div id={readerElId} className="w-full" />
        <p className="text-xs text-muted-foreground text-center">
          Đưa mã QR trên CCCD gắn chip vào vùng quét
        </p>
      </DialogContent>
    </Dialog>
  )
}

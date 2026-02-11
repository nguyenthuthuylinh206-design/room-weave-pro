import { useState, useRef } from 'react'
import { Camera, Upload, Loader2, CheckCircle2, AlertCircle, ScanLine, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/integrations/supabase/client'
import { compressImage } from '@/lib/imageCompression'
import { toast } from 'sonner'
import { useUser } from '@/hooks/useUser'

export interface ScannedDocumentData {
  full_name: string
  id_number: string
  date_of_birth?: string
  gender?: 'male' | 'female'
  nationality?: string
  address?: string
}

interface DocumentScannerProps {
  onScanComplete: (data: ScannedDocumentData, documentType: string, imageUrl?: string) => void
}

const DOCUMENT_TYPES = [
  { value: 'cccd', label: 'CCCD / CMND' },
  { value: 'passport', label: 'Hộ chiếu' },
  { value: 'visa', label: 'Visa' },
]

type ScanStatus = 'idle' | 'uploading' | 'scanning' | 'success' | 'error'

export function DocumentScanner({ onScanComplete }: DocumentScannerProps) {
  const { tenantId } = useUser()
  const [documentType, setDocumentType] = useState('cccd')
  const [status, setStatus] = useState<ScanStatus>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [scannedData, setScannedData] = useState<ScannedDocumentData | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh')
      return
    }

    setStatus('uploading')
    setErrorMessage('')
    setScannedData(null)

    try {
      // Compress and convert to base64
      const base64 = await compressImage(file, 0.8, 1024, 1024)
      setPreviewUrl(base64)

      setStatus('scanning')

      // Call edge function
      const { data, error } = await supabase.functions.invoke('scan-guest-document', {
        body: { imageBase64: base64, documentType },
      })

      if (error) throw error

      if (data?.error) {
        throw new Error(data.error)
      }

      const extractedData = data.data as ScannedDocumentData
      setScannedData(extractedData)
      setStatus('success')

      // Upload image to storage
      let imageUrl: string | undefined
      if (tenantId) {
        const fileName = `${tenantId}/${Date.now()}-${documentType}.jpg`
        const blob = await fetch(base64).then(r => r.blob())
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('guest-documents')
          .upload(fileName, blob, { contentType: 'image/jpeg' })

        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage
            .from('guest-documents')
            .getPublicUrl(uploadData.path)
          imageUrl = urlData.publicUrl
        }
      }

      onScanComplete(extractedData, documentType, imageUrl)
      toast.success('Đã trích xuất thông tin thành công')
    } catch (err: any) {
      console.error('Scan error:', err)
      setStatus('error')
      setErrorMessage(err.message || 'Lỗi khi quét giấy tờ')
      toast.error(err.message || 'Lỗi khi quét giấy tờ')
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const reset = () => {
    setStatus('idle')
    setPreviewUrl(null)
    setScannedData(null)
    setErrorMessage('')
  }

  const isProcessing = status === 'uploading' || status === 'scanning'

  return (
    <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ScanLine className="h-4 w-4 text-primary" />
        Quét giấy tờ tùy thân
      </div>

      {/* Document type + actions row */}
      <div className="flex items-center gap-2">
        <Select value={documentType} onValueChange={setDocumentType} disabled={isProcessing}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPES.map(dt => (
              <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          disabled={isProcessing}
          onClick={() => cameraInputRef.current?.click()}
        >
          <Camera className="h-3.5 w-3.5 mr-1" />
          Chụp ảnh
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          disabled={isProcessing}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5 mr-1" />
          Tải ảnh
        </Button>

        {(status === 'success' || status === 'error') && (
          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs ml-auto" onClick={reset}>
            <X className="h-3.5 w-3.5 mr-1" />
            Xóa
          </Button>
        )}

        {/* Hidden file inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          
          className="hidden"
          onChange={handleFileInput}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {/* Processing indicator */}
      {isProcessing && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          {status === 'uploading' ? 'Đang xử lý ảnh...' : 'Đang trích xuất thông tin...'}
        </div>
      )}

      {/* Preview + Result */}
      {previewUrl && !isProcessing && (
        <div className="flex gap-3">
          <img
            src={previewUrl}
            alt="Document preview"
            className="w-20 h-14 object-cover rounded border"
          />
          {status === 'success' && scannedData && (
            <div className="flex-1 text-xs space-y-0.5">
              <div className="flex items-center gap-1 text-green-600 font-medium mb-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Đã trích xuất
              </div>
              <div><span className="text-muted-foreground">Họ tên:</span> {scannedData.full_name}</div>
              <div><span className="text-muted-foreground">Số GT:</span> {scannedData.id_number}</div>
              {scannedData.date_of_birth && (
                <div><span className="text-muted-foreground">Ngày sinh:</span> {scannedData.date_of_birth}</div>
              )}
              {scannedData.gender && (
                <div><span className="text-muted-foreground">Giới tính:</span> {scannedData.gender === 'male' ? 'Nam' : 'Nữ'}</div>
              )}
            </div>
          )}
          {status === 'error' && (
            <div className="flex-1 flex items-center gap-1 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5" />
              {errorMessage}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

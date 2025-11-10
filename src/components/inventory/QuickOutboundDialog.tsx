import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'

interface QuickOutboundDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickOutboundDialog({ open, onOpenChange }: QuickOutboundDialogProps) {
  const navigate = useNavigate()
  
  const handleNavigate = () => {
    onOpenChange(false)
    navigate('/inventory/outbound/new')
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Xuất kho
          </DialogTitle>
          <DialogDescription>
            Tạo phiếu xuất kho để ghi nhận hàng hóa ra khỏi kho
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Bạn sẽ được chuyển đến trang tạo phiếu xuất kho để:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>Chọn các items cần xuất kho</li>
            <li>Nhập số lượng xuất (tự động kiểm tra tồn kho)</li>
            <li>Ghi nhận người nhận và mục đích sử dụng</li>
            <li>Cảnh báo tự động nếu hàng sắp hết</li>
          </ul>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleNavigate}>
            Tiếp tục
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

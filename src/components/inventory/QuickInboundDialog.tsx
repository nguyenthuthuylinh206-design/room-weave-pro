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
import { Download } from 'lucide-react'

interface QuickInboundDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickInboundDialog({ open, onOpenChange }: QuickInboundDialogProps) {
  const navigate = useNavigate()
  
  const handleNavigate = () => {
    onOpenChange(false)
    navigate('/inventory/inbound/new')
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Nhập kho
          </DialogTitle>
          <DialogDescription>
            Tạo phiếu nhập kho mới để ghi nhận hàng hóa vào kho
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Bạn sẽ được chuyển đến trang tạo phiếu nhập kho để:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>Chọn các items cần nhập kho</li>
            <li>Nhập số lượng và giá nhập</li>
            <li>Ghi chú nguồn hàng và thông tin khác</li>
            <li>Upload chứng từ và hình ảnh</li>
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

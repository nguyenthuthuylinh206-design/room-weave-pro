import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Zap, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { DistributionForm } from '@/components/distribution/forms/DistributionForm'
import { useDistributionForm } from '@/components/distribution/hooks/useDistributionForm'
import { useCreateDistributionOrder } from '@/hooks/useDistributionOrders'
import { useIsMobile } from '@/hooks/use-mobile'
import { useHotelContext } from '@/contexts/HotelContext'
import { toast } from 'sonner'

export default function CreateDistributionPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { mutate: createOrder, isPending } = useCreateDistributionOrder()
  const { isAllHotelsMode } = useHotelContext()
  const [autoRelease, setAutoRelease] = useState(false)
  
  const form = useDistributionForm()

  const handleSubmit = () => {
    if (isAllHotelsMode) {
      toast.error('Vui lòng chọn một khách sạn cụ thể để tạo mới')
      return
    }

    if (form.selectedRoomIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất một phòng')
      return
    }

    const roomsWithItems = form.allocations.filter(a => a.items.length > 0)
    if (roomsWithItems.length === 0) {
      toast.error('Vui lòng thêm sản phẩm để giao')
      return
    }

    if (roomsWithItems.length < form.selectedRoomIds.length) {
      toast.error('Một số phòng chưa có sản phẩm')
      return
    }

    if (!form.stockValidation.isValid) {
      toast.error('Số lượng yêu cầu vượt quá tồn kho')
      return
    }

    createOrder({
      assigned_to: form.assignedTo || undefined,
      notes: form.notes || undefined,
      rooms: roomsWithItems,
      auto_release: autoRelease && !!form.assignedTo,
    }, {
      onSuccess: (result) => {
        navigate(`/inventory/distributions/${result.order_id}`)
      }
    })
  }

  return (
    <div className={isMobile ? 'flex flex-col h-full' : 'container mx-auto py-6 space-y-6'}>
      {/* Header */}
      <div className={isMobile 
        ? 'sticky top-0 z-10 bg-background border-b p-4 flex items-center gap-3'
        : 'flex items-center gap-4'
      }>
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className={isMobile ? 'text-lg font-semibold' : 'text-2xl font-bold'}>
            Tạo phiếu giao hàng
          </h1>
          {!isMobile && (
            <p className="text-muted-foreground">
              Xuất kho và giao đồ đến nhiều phòng cùng lúc
            </p>
          )}
        </div>
      </div>

      {/* Form */}
      <div className={isMobile ? 'flex-1 overflow-auto p-4 space-y-4' : 'space-y-4'}>
        {isAllHotelsMode && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Vui lòng chọn một khách sạn cụ thể để tạo mới. Chế độ "Tất cả khách sạn" chỉ hỗ trợ xem dữ liệu.
            </AlertDescription>
          </Alert>
        )}
        <DistributionForm form={form} />
        
        {/* Auto-release option */}
        {form.assignedTo && (
          <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/50">
            <Checkbox
              id="auto-release"
              checked={autoRelease}
              onCheckedChange={(checked) => setAutoRelease(!!checked)}
            />
            <div className="space-y-1">
              <Label htmlFor="auto-release" className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Giao ngay cho nhân viên (bỏ qua bước kho)
              </Label>
              <p className="text-xs text-muted-foreground">
                Phiếu sẽ được chuyển trực tiếp cho nhân viên mà không cần kho xác nhận
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer with summary */}
      <div className={isMobile 
        ? 'sticky bottom-0 bg-background border-t p-4 space-y-3'
        : 'border-t pt-4 space-y-3'
      }>
        {/* Summary bar */}
        {form.summary.roomCount > 0 && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{form.summary.roomCount} phòng</span>
            <span className="text-muted-foreground/50">•</span>
            <span>{form.summary.itemTypesCount} loại SP</span>
            <span className="text-muted-foreground/50">•</span>
            <span>{form.summary.totalItems} đơn vị</span>
            {form.summary.roomsWithItems < form.summary.roomCount && (
              <>
                <span className="text-muted-foreground/50">•</span>
                <span className="text-amber-600">{form.summary.roomCount - form.summary.roomsWithItems} phòng chưa có SP</span>
              </>
            )}
          </div>
        )}

        {/* Stock validation in footer */}
        {!form.stockValidation.isValid && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Vượt quá tồn kho: {form.stockValidation.overStockItems.map(i => i.itemName).join(', ')}</span>
          </div>
        )}

        <div className={isMobile ? 'flex gap-3' : 'flex justify-end gap-3'}>
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
            className={isMobile ? 'flex-1' : ''}
          >
            Hủy
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isPending || !form.isValid || isAllHotelsMode}
            className={isMobile ? 'flex-1' : ''}
          >
            {isPending ? 'Đang tạo...' : 'Tạo phiếu giao hàng'}
          </Button>
        </div>
      </div>
    </div>
  )
}

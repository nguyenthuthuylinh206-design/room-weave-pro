import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DistributionForm } from '@/components/distribution/forms/DistributionForm'
import { useDistributionForm } from '@/components/distribution/hooks/useDistributionForm'
import { useCreateDistributionOrder } from '@/hooks/useDistributionOrders'
import { useIsMobile } from '@/hooks/use-mobile'
import { toast } from 'sonner'

export default function CreateDistributionPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { mutate: createOrder, isPending } = useCreateDistributionOrder()
  
  const form = useDistributionForm()

  const handleSubmit = () => {
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
      <div className={isMobile ? 'flex-1 overflow-auto p-4' : ''}>
        <DistributionForm form={form} />
      </div>

      {/* Footer */}
      <div className={isMobile 
        ? 'sticky bottom-0 bg-background border-t p-4 flex gap-3'
        : 'flex justify-end gap-3'
      }>
        <Button 
          variant="outline" 
          onClick={() => navigate(-1)}
          className={isMobile ? 'flex-1' : ''}
        >
          Hủy
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={isPending || !form.isValid}
          className={isMobile ? 'flex-1' : ''}
        >
          {isPending ? 'Đang tạo...' : 'Tạo phiếu giao hàng'}
        </Button>
      </div>
    </div>
  )
}

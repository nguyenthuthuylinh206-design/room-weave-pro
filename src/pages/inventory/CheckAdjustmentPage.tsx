import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ImageUpload } from '@/components/shared/ImageUpload'
import { 
  useStockAdjustment, 
  useCheckAdjustmentItem,
  useUpdateAdjustmentStatus,
} from '@/hooks/useStockAdjustments'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export function CheckAdjustmentPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [formData, setFormData] = useState<Record<string, any>>({})
  
  const { data, isLoading } = useStockAdjustment(id)
  const { mutate: checkItem } = useCheckAdjustmentItem()
  const { mutate: updateStatus } = useUpdateAdjustmentStatus()
  
  const adjustment = data?.adjustment
  const items = data?.items || []
  const currentItem = items[currentIndex]
  
  // Start checking if status is draft
  useEffect(() => {
    if (adjustment && adjustment.status === 'draft') {
      updateStatus({ adjustmentId: adjustment.id, status: 'in_progress' })
    }
  }, [adjustment])
  
  if (isLoading || !adjustment || !currentItem) {
    return <div>Loading...</div>
  }
  
  const progress = ((currentIndex + 1) / items.length) * 100
  const checkedCount = items.filter((i: any) => i.status !== 'pending').length
  
  const handleSubmitItem = () => {
    const data = formData[currentItem.id] || {}
    const actualQuantity = data.actual_quantity ?? currentItem.system_quantity
    
    checkItem(
      {
        adjustmentId: adjustment.id,
        itemData: {
          item_id: currentItem.item_id,
          actual_quantity: actualQuantity,
          discrepancy_reason: data.discrepancy_reason,
          photos: data.photos,
        },
      },
      {
        onSuccess: () => {
          if (currentIndex < items.length - 1) {
            setCurrentIndex(currentIndex + 1)
          }
        },
      }
    )
  }
  
  const handleSkip = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }
  
  const handleComplete = () => {
    updateStatus(
      { adjustmentId: adjustment.id, status: 'completed' },
      {
        onSuccess: () => {
          navigate(`/inventory/adjustments/${adjustment.id}`)
        },
      }
    )
  }
  
  const currentData = formData[currentItem.id] || {}
  const actualQuantity = currentData.actual_quantity ?? currentItem.system_quantity
  const discrepancy = actualQuantity - currentItem.system_quantity
  const hasDiscrepancy = discrepancy !== 0
  
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Kiểm kê - ${adjustment.adjustment_code}`}
        description={`Bắt đầu: ${adjustment.started_at ? format(new Date(adjustment.started_at), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'Chưa bắt đầu'}`}
      >
        <Button variant="outline" onClick={() => navigate(`/inventory/adjustments/${id}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại
        </Button>
      </PageHeader>
      
      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                Tiến độ: {checkedCount}/{items.length} items
              </span>
              <Badge>{Math.round(progress)}%</Badge>
            </div>
            <Progress value={progress} />
          </div>
        </CardContent>
      </Card>
      
      {/* Checking Interface */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Item {currentIndex + 1}/{items.length}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentIndex(Math.min(items.length - 1, currentIndex + 1))}
                disabled={currentIndex === items.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Item Info */}
          <div className="flex items-start gap-4">
            {currentItem.item?.images?.[0] && (
              <img
                src={currentItem.item.images[0]}
                alt={currentItem.item.name}
                className="h-24 w-24 rounded-lg object-cover"
              />
            )}
            <div className="flex-1">
              <h3 className="text-xl font-bold">{currentItem.item?.name}</h3>
              <p className="text-sm text-muted-foreground">{currentItem.item?.code}</p>
              {currentItem.item?.category && (
                <Badge variant="outline" className="mt-2">
                  {currentItem.item.category.name}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Quantities */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Hệ thống</p>
              <p className="text-3xl font-bold">{currentItem.system_quantity}</p>
            </div>
            
            <div className="rounded-lg border p-4">
              <label className="text-sm text-muted-foreground">Thực tế *</label>
              <Input
                type="number"
                value={actualQuantity}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    [currentItem.id]: {
                      ...currentData,
                      actual_quantity: parseInt(e.target.value) || 0,
                    },
                  })
                }}
                className="mt-1 text-2xl font-bold"
                autoFocus
              />
            </div>
          </div>
          
          {/* Discrepancy */}
          {hasDiscrepancy && (
            <div className={cn(
              'rounded-lg border p-4',
              discrepancy > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            )}>
              <p className="text-sm text-muted-foreground">Chênh lệch</p>
              <p className={cn(
                'text-3xl font-bold',
                discrepancy > 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {discrepancy > 0 ? '+' : ''}{discrepancy}
              </p>
            </div>
          )}
          
          {/* Condition */}
          <div>
            <label className="text-sm font-medium">Tình trạng</label>
            <Select
              value={currentData.condition || 'good'}
              onValueChange={(value) => {
                setFormData({
                  ...formData,
                  [currentItem.id]: {
                    ...currentData,
                    condition: value,
                  },
                })
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="good">✓ Tốt</SelectItem>
                <SelectItem value="damaged">❌ Hư hỏng</SelectItem>
                <SelectItem value="lost">🚫 Mất</SelectItem>
                <SelectItem value="other">Khác</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Reason (if discrepancy) */}
          {hasDiscrepancy && (
            <div>
              <label className="text-sm font-medium">Lý do chênh lệch *</label>
              <Textarea
                value={currentData.discrepancy_reason || ''}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    [currentItem.id]: {
                      ...currentData,
                      discrepancy_reason: e.target.value,
                    },
                  })
                }}
                placeholder="Giải thích nguyên nhân chênh lệch..."
                rows={3}
                className="mt-1"
              />
            </div>
          )}
          
          {/* Photos */}
          <div>
            <label className="text-sm font-medium">
              Chụp ảnh {hasDiscrepancy && '(bắt buộc nếu có chênh lệch)'}
            </label>
            <ImageUpload
              images={currentData.photos || []}
              onChange={(photos) => {
                setFormData({
                  ...formData,
                  [currentItem.id]: {
                    ...currentData,
                    photos,
                  },
                })
              }}
              maxImages={5}
            />
          </div>
          
          {/* Actions */}
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={handleSubmitItem}
              disabled={hasDiscrepancy && !currentData.discrepancy_reason}
            >
              <Check className="mr-2 h-4 w-4" />
              Xác nhận
            </Button>
            <Button
              variant="outline"
              onClick={handleSkip}
            >
              Bỏ qua
            </Button>
          </div>
          
          {/* Complete Button */}
          {currentIndex === items.length - 1 && checkedCount === items.length && (
            <Button
              className="w-full"
              size="lg"
              onClick={handleComplete}
            >
              Hoàn thành kiểm kê
            </Button>
          )}
        </CardContent>
      </Card>
      
      {/* Keyboard Shortcuts Help */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            <kbd className="px-2 py-1 bg-muted rounded">Enter</kbd> Xác nhận • 
            <kbd className="px-2 py-1 bg-muted rounded ml-2">Tab</kbd> Next field • 
            <kbd className="px-2 py-1 bg-muted rounded ml-2">Ctrl+P</kbd> Previous • 
            <kbd className="px-2 py-1 bg-muted rounded ml-2">Ctrl+N</kbd> Next
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

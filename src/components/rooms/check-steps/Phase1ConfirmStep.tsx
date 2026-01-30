import { useState } from 'react'
import { Bell, AlertTriangle, Package, Loader2, CheckCircle, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils'
import type { CreateChargeableConsumptionInput } from '@/hooks/useChargeableConsumptions'
import type { LostItem, DamagedItem } from '@/types/rooms.types'

interface Phase1ConfirmStepProps {
  chargeableItems: CreateChargeableConsumptionInput[]
  lostItems: LostItem[]
  damagedItems: DamagedItem[]
  roomNumber: string
  guestName?: string
  onSubmitPhase1: () => Promise<void>
  onContinue: () => void
  isSubmitting: boolean
  phase1Submitted: boolean
}

export function Phase1ConfirmStep({
  chargeableItems,
  lostItems,
  damagedItems,
  roomNumber,
  guestName,
  onSubmitPhase1,
  onContinue,
  isSubmitting,
  phase1Submitted,
}: Phase1ConfirmStepProps) {
  // Calculate totals
  const chargeableTotal = chargeableItems.reduce((sum, item) => {
    return sum + (item.quantity * item.unit_price)
  }, 0)

  const lostTotal = lostItems.reduce((sum, item) => {
    return sum + (item.estimated_value || 0)
  }, 0)

  const damagedTotal = damagedItems.reduce((sum, item) => {
    return sum + (item.damage_cost || 0)
  }, 0)

  const grandTotal = chargeableTotal + lostTotal + damagedTotal

  const hasNoCharges = chargeableItems.length === 0 && lostItems.length === 0 && damagedItems.length === 0

  if (phase1Submitted) {
    return (
      <div className="space-y-4">
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            <span className="font-medium">Đã gửi báo cáo cho lễ tân!</span>
            <span className="block text-sm mt-1">Lễ tân đã nhận được thông báo để tính tiền khách. Bạn có thể tiếp tục kiểm tra đồ bổ sung.</span>
          </AlertDescription>
        </Alert>
        
        <div className="flex justify-center">
          <Button type="button" variant="outline" className="gap-2" onClick={onContinue}>
            <ChevronRight className="h-4 w-4" />
            Tiếp tục kiểm tra đồ bổ sung
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-orange-700">
        <Bell className="h-5 w-5" />
        <h3 className="font-semibold">Gửi báo cáo cho lễ tân</h3>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Xem lại thông tin phụ thu và đồ mất/hỏng. Sau khi gửi, lễ tân sẽ nhận thông báo ngay để tính tiền khách.
      </p>

      {/* Summary Card */}
      <Card className="border-orange-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>📋 Tóm tắt phụ thu - Phòng {roomNumber}</span>
            {guestName && (
              <Badge variant="outline" className="font-normal">
                {guestName}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasNoCharges ? (
            <div className="py-6 text-center text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Không có phụ thu nào</p>
              <p className="text-xs mt-1">Khách không sử dụng dịch vụ tính phí và không có đồ mất/hỏng</p>
            </div>
          ) : (
            <>
              {/* Chargeable Items */}
              {chargeableItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Đồ dùng tính phí (Minibar)</h4>
                  <div className="space-y-1">
                    {chargeableItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span>
                          {item.quantity}x {item.item_name}
                          {item.item_code && (
                            <span className="text-muted-foreground ml-1">({item.item_code})</span>
                          )}
                        </span>
                        <span className="font-medium">{formatCurrency(item.quantity * item.unit_price)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-sm pt-1 border-t border-dashed">
                    <span className="text-muted-foreground">Tổng minibar:</span>
                    <span className="font-medium text-amber-700">{formatCurrency(chargeableTotal)}</span>
                  </div>
                </div>
              )}

              {/* Lost Items */}
              {lostItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Đồ mất
                  </h4>
                  <div className="space-y-1">
                    {lostItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span>
                          {item.quantity}x {item.item_name}
                          <span className="text-muted-foreground ml-1">({item.item_type})</span>
                        </span>
                        <span className="font-medium text-red-600">
                          {item.estimated_value ? formatCurrency(item.estimated_value) : 'Chưa định giá'}
                        </span>
                      </div>
                    ))}
                  </div>
                  {lostTotal > 0 && (
                    <div className="flex justify-between text-sm pt-1 border-t border-dashed">
                      <span className="text-muted-foreground">Tổng đồ mất:</span>
                      <span className="font-medium text-red-600">{formatCurrency(lostTotal)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Damaged Items */}
              {damagedItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Đồ hỏng
                  </h4>
                  <div className="space-y-1">
                    {damagedItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span>
                          {item.quantity}x {item.item_name}
                          <Badge variant="outline" className="ml-1 text-xs">
                            {item.damage_type === 'repairable' ? 'Sửa được' : 'Cần thay'}
                          </Badge>
                        </span>
                        <span className="font-medium text-amber-600">
                          {item.damage_cost ? formatCurrency(item.damage_cost) : 'Chưa định giá'}
                        </span>
                      </div>
                    ))}
                  </div>
                  {damagedTotal > 0 && (
                    <div className="flex justify-between text-sm pt-1 border-t border-dashed">
                      <span className="text-muted-foreground">Tổng đồ hỏng:</span>
                      <span className="font-medium text-amber-600">{formatCurrency(damagedTotal)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Grand Total */}
              <Separator />
              <div className="flex items-center justify-between">
                <span className="font-semibold">TỔNG CỘNG</span>
                <span className="text-xl font-bold text-orange-700">{formatCurrency(grandTotal)}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <Bell className="h-4 w-4" />
        <AlertDescription>
          📱 Lễ tân sẽ nhận thông báo <strong>ngay lập tức</strong> khi bạn gửi để tính tiền cho khách.
          <span className="block text-xs text-muted-foreground mt-1">
            Sau khi gửi, bạn sẽ tiếp tục kiểm tra đồ bổ sung và dọn dẹp.
          </span>
        </AlertDescription>
      </Alert>

      {/* Submit Button */}
      <Button
        type="button"
        onClick={onSubmitPhase1}
        disabled={isSubmitting}
        className="w-full bg-orange-600 hover:bg-orange-700 h-12 text-base"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Đang gửi...
          </>
        ) : (
          <>
            <Bell className="mr-2 h-5 w-5" />
            {hasNoCharges ? 'Không có phụ thu - Tiếp tục' : 'Gửi cho lễ tân & Tiếp tục'}
          </>
        )}
      </Button>
    </div>
  )
}

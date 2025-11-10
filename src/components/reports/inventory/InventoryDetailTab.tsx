import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface InventoryDetailTabProps {
  dateRange: {
    start: Date
    end: Date
  }
}

export function InventoryDetailTab({ dateRange }: InventoryDetailTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Chi tiết tồn kho</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Đang phát triển... (Kỳ: {dateRange.start.toLocaleDateString('vi-VN')} - {dateRange.end.toLocaleDateString('vi-VN')})
        </p>
      </CardContent>
    </Card>
  )
}

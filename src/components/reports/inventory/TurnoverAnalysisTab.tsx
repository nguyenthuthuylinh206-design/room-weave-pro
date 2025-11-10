import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTurnoverAnalysis } from '@/hooks/useReports'

export function TurnoverAnalysisTab() {
  const { data: items, isLoading } = useTurnoverAnalysis()
  
  if (isLoading) {
    return <div>Loading...</div>
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Phân tích vòng quay tồn kho</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Đang phát triển... ({items?.length || 0} items)
        </p>
      </CardContent>
    </Card>
  )
}

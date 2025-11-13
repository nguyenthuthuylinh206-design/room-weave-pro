import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import type { RoomCheckWithUser } from '@/types/rooms.types'

interface RoomHealthScoreProps {
  checks: RoomCheckWithUser[]
  totalItems: number
  missingItems: number
}

export function RoomHealthScore({ checks, totalItems, missingItems }: RoomHealthScoreProps) {
  // Calculate health score based on various factors
  const calculateHealthScore = () => {
    let score = 100
    
    // Factor 1: Check frequency (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentChecks = checks.filter(c => new Date(c.checked_at) > thirtyDaysAgo)
    
    if (recentChecks.length === 0) {
      score -= 30 // No checks in 30 days
    } else if (recentChecks.length < 5) {
      score -= 15 // Less than 5 checks per month
    }
    
    // Factor 2: Average cleanliness score
    const avgCleanliness = checks.length > 0
      ? checks.reduce((sum, c) => sum + (c.cleanliness_score || 0), 0) / checks.length
      : 5
    
    if (avgCleanliness < 3) {
      score -= 25
    } else if (avgCleanliness < 4) {
      score -= 10
    }
    
    // Factor 3: Missing items percentage
    const missingPercentage = totalItems > 0 ? (missingItems / totalItems) * 100 : 0
    score -= missingPercentage * 0.5
    
    // Factor 4: Incomplete checks
    const incompleteChecks = checks.filter(c => !c.items_complete).length
    const incompletePercentage = checks.length > 0 ? (incompleteChecks / checks.length) * 100 : 0
    score -= incompletePercentage * 0.3
    
    return Math.max(0, Math.min(100, score))
  }
  
  const healthScore = calculateHealthScore()
  
  const getScoreColor = () => {
    if (healthScore >= 80) return 'text-green-600'
    if (healthScore >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }
  
  const getScoreLabel = () => {
    if (healthScore >= 80) return 'Xuất sắc'
    if (healthScore >= 60) return 'Tốt'
    if (healthScore >= 40) return 'Cần cải thiện'
    return 'Kém'
  }
  
  const getScoreBadgeVariant = () => {
    if (healthScore >= 80) return 'default'
    if (healthScore >= 60) return 'secondary'
    return 'destructive'
  }
  
  // Calculate trend (comparing last 5 checks to previous 5)
  const calculateTrend = () => {
    if (checks.length < 6) return 'stable'
    
    const recent5 = checks.slice(0, 5)
    const previous5 = checks.slice(5, 10)
    
    const recentAvg = recent5.reduce((sum, c) => sum + (c.cleanliness_score || 0), 0) / 5
    const previousAvg = previous5.reduce((sum, c) => sum + (c.cleanliness_score || 0), 0) / 5
    
    const diff = recentAvg - previousAvg
    
    if (diff > 0.3) return 'up'
    if (diff < -0.3) return 'down'
    return 'stable'
  }
  
  const trend = calculateTrend()
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Chỉ số sức khỏe phòng</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-4xl font-bold ${getScoreColor()}`}>
                {Math.round(healthScore)}
              </span>
              <span className="text-muted-foreground">/100</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={getScoreBadgeVariant()}>
                {getScoreLabel()}
              </Badge>
              {trend === 'up' && (
                <div className="flex items-center gap-1 text-green-600 text-xs">
                  <TrendingUp className="h-3 w-3" />
                  <span>Cải thiện</span>
                </div>
              )}
              {trend === 'down' && (
                <div className="flex items-center gap-1 text-red-600 text-xs">
                  <TrendingDown className="h-3 w-3" />
                  <span>Giảm</span>
                </div>
              )}
              {trend === 'stable' && (
                <div className="flex items-center gap-1 text-muted-foreground text-xs">
                  <Minus className="h-3 w-3" />
                  <span>Ổn định</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <Progress value={healthScore} className="h-2" />
        
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>
            <strong>Tần suất kiểm tra:</strong> {checks.filter(c => {
              const thirtyDaysAgo = new Date()
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
              return new Date(c.checked_at) > thirtyDaysAgo
            }).length} lần/tháng
          </p>
          <p>
            <strong>Điểm sạch TB:</strong> {checks.length > 0 
              ? (checks.reduce((sum, c) => sum + (c.cleanliness_score || 0), 0) / checks.length).toFixed(1)
              : 'N/A'
            }/5
          </p>
          <p>
            <strong>Đồ dùng thiếu:</strong> {missingItems}/{totalItems} ({totalItems > 0 
              ? Math.round((missingItems / totalItems) * 100)
              : 0
            }%)
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

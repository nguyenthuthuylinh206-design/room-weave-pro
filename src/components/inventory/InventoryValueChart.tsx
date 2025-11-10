import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useInventoryValueOverTime } from '@/hooks/useInventoryDashboard'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'

export function InventoryValueChart() {
  const { data: chartData, isLoading } = useInventoryValueOverTime(12)
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }
  
  const formattedData = chartData?.map(item => ({
    month: format(new Date(item.month), 'MMM yyyy'),
    'Giá trị kho': Math.round(item.stock_value),
    'Nhập': Math.round(item.value_in),
    'Xuất': Math.round(item.value_out),
  })) || []
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Giá trị tồn kho theo thời gian</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip 
              formatter={(value: number) => 
                new Intl.NumberFormat('vi-VN', { 
                  style: 'currency', 
                  currency: 'VND',
                  maximumFractionDigits: 0,
                }).format(value)
              }
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="Giá trị kho" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="Nhập" 
              stroke="hsl(var(--success))" 
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="Xuất" 
              stroke="hsl(var(--warning))" 
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

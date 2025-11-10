import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useInventoryValueOverTime } from '@/hooks/useInventoryDashboard'
import { format } from 'date-fns'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function InventoryValueChart() {
  const [months, setMonths] = useState(12)
  const { data: valueData, isLoading } = useInventoryValueOverTime(months)
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    )
  }
  
  const chartData = valueData?.map(item => ({
    month: format(new Date(item.month), 'MMM'),
    'Giá trị tồn kho': item.stock_value,
    'Nhập trong tháng': item.value_in,
    'Xuất trong tháng': item.value_out,
  })) || []
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-sm">
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span className="font-medium">{formatCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Giá trị tồn kho</CardTitle>
            <CardDescription>Biến động giá trị kho theo thời gian</CardDescription>
          </div>
          <Select value={months.toString()} onValueChange={(v) => setMonths(parseInt(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 tháng</SelectItem>
              <SelectItem value="6">6 tháng</SelectItem>
              <SelectItem value="12">12 tháng</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="stockValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="valueIn" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="valueOut" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="month"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            <Area
              type="monotone"
              dataKey="Giá trị tồn kho"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#stockValue)"
            />
            
            <Line
              type="monotone"
              dataKey="Nhập trong tháng"
              stroke="hsl(var(--success))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: 'hsl(var(--success))', r: 3 }}
            />
            
            <Line
              type="monotone"
              dataKey="Xuất trong tháng"
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: 'hsl(var(--destructive))', r: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
        
        <div className="mt-4 grid grid-cols-3 gap-4 border-t pt-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Giá trị hiện tại</p>
            <p className="text-lg font-bold text-primary">
              {chartData.length > 0 
                ? formatCurrency(chartData[chartData.length - 1]['Giá trị tồn kho'])
                : '0 ₫'
              }
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Tổng nhập</p>
            <p className="text-lg font-bold text-success">
              {formatCurrency(
                chartData.reduce((sum, item) => sum + item['Nhập trong tháng'], 0)
              )}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Tổng xuất</p>
            <p className="text-lg font-bold text-destructive">
              {formatCurrency(
                chartData.reduce((sum, item) => sum + item['Xuất trong tháng'], 0)
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

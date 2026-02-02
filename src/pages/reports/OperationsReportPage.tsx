import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Download, FileText, ArrowRightLeft, TrendingUp, Package, ClipboardCheck, Clock, CheckCircle, AlertTriangle, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { HotelFilterCard } from '@/components/reports/HotelFilterCard'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Progress } from '@/components/ui/progress'
import { useInventoryReport } from '@/hooks/useReports'
import { useReportExport } from '@/hooks/useReportExport'
import { useBreakpoint } from '@/lib/breakpoints'
import { MobileOperationsReportPage } from '@/components/reports/MobileOperationsReportPage'
import { formatCurrency } from '@/lib/utils'
import { subDays } from 'date-fns'

export function OperationsReportPage() {
  const { t } = useTranslation('reports')
  const { isMobile } = useBreakpoint()
  const navigate = useNavigate()
  const chartRefs = useRef<HTMLElement[]>([])
  
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30),
    end: new Date(),
  })
  
  const { data: reportData, isLoading } = useInventoryReport(dateRange)
  const { exportToPDF, exportToExcel, isExporting } = useReportExport()

  if (isMobile) {
    return <MobileOperationsReportPage />
  }

  const transactionSummary = reportData?.transaction_summary || {
    total_transactions: 0,
    inbound_count: 0,
    outbound_count: 0,
    inbound_value: 0,
    outbound_value: 0,
    net_change_value: 0,
  }

  // Transaction trend from real data (calculated from transaction_summary)
  const transactionTrend = reportData?.transaction_summary ? [
    { 
      month: 'Kỳ này', 
      inbound: transactionSummary.inbound_count, 
      outbound: transactionSummary.outbound_count, 
      adjustment: transactionSummary.total_transactions - transactionSummary.inbound_count - transactionSummary.outbound_count 
    },
  ] : []

  // Top items from inventory data
  const topMovingItems = reportData?.top_items_by_value?.slice(0, 5).map((item, index) => ({
    name: item.item_name,
    code: item.item_code,
    inbound: 0, // Would need separate query for movement data
    outbound: 0,
    turnover: item.quantity > 0 ? (item.total_value / item.quantity / 1000) : 0,
  })) || []

  // Stocktake results placeholder - would need separate tracking
  const stocktakeResults = {
    total_checks: 0,
    items_checked: reportData?.summary?.total_types || 0,
    accuracy_rate: 0,
    discrepancies: 0,
    adjusted_value: 0,
  }

  // Efficiency metrics placeholder
  const efficiencyMetrics = {
    avg_processing_time: 0,
    on_time_delivery_rate: 0,
    error_rate: 0,
    staff_productivity: 0,
  }

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/reports')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{t('operations.pageTitle')}</h1>
            <p className="text-xs text-muted-foreground">{t('operations.pageDescription')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={isExporting} className="h-8 text-xs">
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            PDF
          </Button>
          <Button variant="outline" size="sm" disabled={isExporting} className="h-8 text-xs">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Excel
          </Button>
        </div>
      </div>
      
      {/* Hotel Filter */}
      <HotelFilterCard />
      
      {/* Date Range - Compact */}
      <div className="border rounded-lg p-3 flex items-center gap-3">
        <span className="text-xs font-medium text-muted-foreground">{t('operations.reportPeriod')}</span>
        <DateRangePicker
          value={{ from: dateRange.start, to: dateRange.end }}
          onChange={(range) => 
            setDateRange({
              start: range.from || new Date(),
              end: range.to || new Date(),
            })
          }
        />
      </div>
      
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList className="h-8">
          <TabsTrigger value="transactions" className="text-xs h-7 px-3">{t('operations.tabs.transactions')}</TabsTrigger>
          <TabsTrigger value="stocktake" className="text-xs h-7 px-3">{t('operations.tabs.stocktake')}</TabsTrigger>
          <TabsTrigger value="efficiency" className="text-xs h-7 px-3">{t('operations.tabs.efficiency')}</TabsTrigger>
        </TabsList>
        
        {/* TAB 1: Transactions */}
        <TabsContent value="transactions" className="space-y-4">
          {/* Summary Stats Row */}
          <div className="grid gap-3 md:grid-cols-4">
            <div className="border rounded-lg p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('operations.stats.inbound')}</p>
                <p className="text-xl font-bold">{transactionSummary.inbound_count}</p>
                <p className="text-[10px] text-green-600 truncate">{formatCurrency(transactionSummary.inbound_value)}</p>
              </div>
            </div>
            
            <div className="border rounded-lg p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <ArrowRightLeft className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('operations.stats.outbound')}</p>
                <p className="text-xl font-bold">{transactionSummary.outbound_count}</p>
                <p className="text-[10px] text-blue-600 truncate">{formatCurrency(transactionSummary.outbound_value)}</p>
              </div>
            </div>
            
            <div className="border rounded-lg p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Package className="h-4 w-4 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('operations.stats.totalTransactions')}</p>
                <p className="text-xl font-bold">{transactionSummary.total_transactions}</p>
                <p className="text-[10px] text-muted-foreground">{t('operations.stats.transactions')}</p>
              </div>
            </div>
            
            <div className="border rounded-lg p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('operations.stats.netChange')}</p>
                <p className="text-xl font-bold">{formatCurrency(transactionSummary.net_change_value)}</p>
                <p className="text-[10px] text-muted-foreground">{t('operations.stats.inPeriod')}</p>
              </div>
            </div>
          </div>
          
          {/* Transaction Trend Chart */}
          <div className="border rounded-lg p-4" ref={(el) => el && (chartRefs.current[0] = el)}>
            <h3 className="text-sm font-medium mb-3">{t('operations.chart.title')}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={transactionTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="inbound" name={t('operations.chart.inbound')} fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="outbound" name={t('operations.chart.outbound')} fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="adjustment" name={t('operations.chart.adjustment')} fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Top Moving Items */}
          <div className="border rounded-lg overflow-hidden">
            <div className="p-3 border-b bg-muted/30">
              <h3 className="text-sm font-medium">{t('operations.topItems.title')}</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs h-9 w-12">#</TableHead>
                  <TableHead className="text-xs h-9">{t('operations.topItems.item')}</TableHead>
                  <TableHead className="text-xs h-9 text-center w-20">{t('operations.topItems.inbound')}</TableHead>
                  <TableHead className="text-xs h-9 text-center w-20">{t('operations.topItems.outbound')}</TableHead>
                  <TableHead className="text-xs h-9 text-center w-24">{t('operations.topItems.turnover')}</TableHead>
                  <TableHead className="text-xs h-9 w-28">{t('operations.topItems.trend')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topMovingItems.map((item, index) => (
                  <TableRow key={item.code} className="hover:bg-muted/30">
                    <TableCell className="text-xs py-2 font-medium text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="py-2">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">{item.code}</p>
                    </TableCell>
                    <TableCell className="text-xs py-2 text-center text-green-600 font-medium">+{item.inbound}</TableCell>
                    <TableCell className="text-xs py-2 text-center text-blue-600 font-medium">-{item.outbound}</TableCell>
                    <TableCell className="text-xs py-2 text-center">
                      <span className="font-semibold">{item.turnover}x</span>
                    </TableCell>
                    <TableCell className="py-2">
                      <Progress value={item.turnover * 10} className="h-1.5" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        {/* TAB 2: Stocktake */}
        <TabsContent value="stocktake" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="border rounded-lg p-3 flex items-center gap-3">
              <ClipboardCheck className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('operations.stocktake.checkCount')}</p>
                <p className="text-xl font-bold">{stocktakeResults.total_checks}</p>
              </div>
            </div>
            
            <div className="border rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('operations.stocktake.itemsChecked')}</p>
              <p className="text-xl font-bold">{stocktakeResults.items_checked}</p>
            </div>
            
            <div className="border rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('operations.stocktake.accuracy')}</p>
              <p className="text-xl font-bold text-green-600">{stocktakeResults.accuracy_rate}%</p>
            </div>
            
            <div className="border rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('operations.stocktake.adjustmentValue')}</p>
              <p className="text-xl font-bold">{formatCurrency(stocktakeResults.adjusted_value)}</p>
            </div>
          </div>
          
          <div className="border rounded-lg">
            <div className="p-3 border-b bg-muted/30">
              <h3 className="text-sm font-medium">{t('operations.stocktake.recentResults')}</h3>
            </div>
            <div className="p-6 text-center text-sm text-muted-foreground">
              {t('operations.stocktake.noData')}
            </div>
          </div>
        </TabsContent>
        
        {/* TAB 3: Efficiency */}
        <TabsContent value="efficiency" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="border rounded-lg p-3 flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('operations.efficiency.avgProcessingTime')}</p>
                <p className="text-xl font-bold">{efficiencyMetrics.avg_processing_time}h</p>
              </div>
            </div>
            
            <div className="border rounded-lg p-3 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('operations.efficiency.onTime')}</p>
                <p className="text-xl font-bold text-green-600">{efficiencyMetrics.on_time_delivery_rate}%</p>
              </div>
            </div>
            
            <div className="border rounded-lg p-3 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('operations.efficiency.errorRate')}</p>
                <p className="text-xl font-bold text-red-600">{efficiencyMetrics.error_rate}%</p>
              </div>
            </div>
            
            <div className="border rounded-lg p-3 flex items-center gap-3">
              <Users className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('operations.efficiency.staffProductivity')}</p>
                <p className="text-xl font-bold">{efficiencyMetrics.staff_productivity}%</p>
              </div>
            </div>
          </div>
          
          {/* Efficiency Progress Bars */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-medium">Chi tiết hiệu suất</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Tỷ lệ đúng hạn</span>
                  <span className="font-medium text-green-600">{efficiencyMetrics.on_time_delivery_rate}%</span>
                </div>
                <Progress value={efficiencyMetrics.on_time_delivery_rate} className="h-1.5" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Năng suất nhân viên</span>
                  <span className="font-medium">{efficiencyMetrics.staff_productivity}%</span>
                </div>
                <Progress value={efficiencyMetrics.staff_productivity} className="h-1.5" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Độ chính xác</span>
                  <span className="font-medium text-green-600">{100 - efficiencyMetrics.error_rate}%</span>
                </div>
                <Progress value={100 - efficiencyMetrics.error_rate} className="h-1.5" />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

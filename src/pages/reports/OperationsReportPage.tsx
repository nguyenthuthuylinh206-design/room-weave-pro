import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Download, FileText, ArrowRightLeft, TrendingUp, Package, ClipboardCheck } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { HotelFilterCard } from '@/components/reports/HotelFilterCard'
import { Badge } from '@/components/ui/badge'
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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Progress } from '@/components/ui/progress'
import { useInventoryReport } from '@/hooks/useReports'
import { useReportExport } from '@/hooks/useReportExport'
import { useBreakpoint } from '@/lib/breakpoints'
import { MobileOperationsReportPage } from '@/components/reports/MobileOperationsReportPage'
import { formatCurrency } from '@/lib/utils'
import { subDays } from 'date-fns'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

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

  // Mock data for operations metrics
  const transactionSummary = reportData?.transaction_summary || {
    total_transactions: 0,
    inbound_count: 0,
    outbound_count: 0,
    inbound_value: 0,
    outbound_value: 0,
    net_change_value: 0,
  }

  const transactionTrend = [
    { month: 'T10', inbound: 45, outbound: 38, adjustment: 5 },
    { month: 'T11', inbound: 52, outbound: 48, adjustment: 8 },
    { month: 'T12', inbound: 38, outbound: 42, adjustment: 3 },
  ]

  const topMovingItems = [
    { name: 'Khăn tắm lớn', code: 'KTL-001', inbound: 200, outbound: 185, turnover: 8.2 },
    { name: 'Ga trải giường', code: 'GTG-001', inbound: 150, outbound: 142, turnover: 7.5 },
    { name: 'Vỏ gối', code: 'VG-001', inbound: 180, outbound: 165, turnover: 6.8 },
    { name: 'Khăn mặt', code: 'KM-001', inbound: 250, outbound: 230, turnover: 6.2 },
    { name: 'Áo choàng', code: 'AC-001', inbound: 50, outbound: 45, turnover: 5.5 },
  ]

  const stocktakeResults = {
    total_checks: 12,
    items_checked: 450,
    accuracy_rate: 98.5,
    discrepancies: 8,
    adjusted_value: 1250000,
  }

  const efficiencyMetrics = {
    avg_processing_time: 2.5,
    on_time_delivery_rate: 94.5,
    error_rate: 1.2,
    staff_productivity: 85,
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('operations.pageTitle')}
        description={t('operations.pageDescription')}
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/reports')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('operations.back')}
          </Button>
          <Button variant="outline" disabled={isExporting}>
            <FileText className="mr-2 h-4 w-4" />
            {t('operations.exportPdf')}
          </Button>
          <Button variant="outline" disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            {t('operations.exportExcel')}
          </Button>
        </div>
      </PageHeader>
      
      {/* Hotel Filter */}
      <HotelFilterCard />
      
      {/* Date Range */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">{t('operations.reportPeriod')}</label>
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
        </CardContent>
      </Card>
      
      <Tabs defaultValue="transactions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="transactions">{t('operations.tabs.transactions')}</TabsTrigger>
          <TabsTrigger value="stocktake">{t('operations.tabs.stocktake')}</TabsTrigger>
          <TabsTrigger value="efficiency">{t('operations.tabs.efficiency')}</TabsTrigger>
        </TabsList>
        
        {/* TAB 1: Transactions */}
        <TabsContent value="transactions" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <div className="rounded-full p-2 bg-green-50">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('operations.stats.inbound')}</p>
                    <p className="text-2xl font-bold">{transactionSummary.inbound_count}</p>
                    <p className="text-xs text-green-600">{formatCurrency(transactionSummary.inbound_value)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <div className="rounded-full p-2 bg-blue-50">
                    <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('operations.stats.outbound')}</p>
                    <p className="text-2xl font-bold">{transactionSummary.outbound_count}</p>
                    <p className="text-xs text-blue-600">{formatCurrency(transactionSummary.outbound_value)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <div className="rounded-full p-2 bg-purple-50">
                    <Package className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('operations.stats.totalTransactions')}</p>
                    <p className="text-2xl font-bold">{transactionSummary.total_transactions}</p>
                    <p className="text-xs text-muted-foreground">{t('operations.stats.transactions')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <div className="rounded-full p-2 bg-orange-50">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('operations.stats.netChange')}</p>
                    <p className="text-2xl font-bold">{formatCurrency(transactionSummary.net_change_value)}</p>
                    <p className="text-xs text-muted-foreground">{t('operations.stats.inPeriod')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Transaction Trend Chart */}
          <Card ref={(el) => el && (chartRefs.current[0] = el)}>
            <CardHeader>
              <CardTitle>{t('operations.chart.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={transactionTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="inbound" name={t('operations.chart.inbound')} fill="#10b981" />
                  <Bar dataKey="outbound" name={t('operations.chart.outbound')} fill="#3b82f6" />
                  <Bar dataKey="adjustment" name={t('operations.chart.adjustment')} fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          {/* Top Moving Items */}
          <Card>
            <CardHeader>
              <CardTitle>{t('operations.topItems.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('operations.topItems.rank')}</TableHead>
                      <TableHead>{t('operations.topItems.item')}</TableHead>
                      <TableHead className="text-center">{t('operations.topItems.inbound')}</TableHead>
                      <TableHead className="text-center">{t('operations.topItems.outbound')}</TableHead>
                      <TableHead className="text-center">{t('operations.topItems.turnover')}</TableHead>
                      <TableHead>{t('operations.topItems.trend')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topMovingItems.map((item, index) => (
                      <TableRow key={item.code}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.code}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-green-600">+{item.inbound}</TableCell>
                        <TableCell className="text-center text-blue-600">-{item.outbound}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{item.turnover}x</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="w-20">
                            <Progress value={item.turnover * 10} className="h-2" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* TAB 2: Stocktake */}
        <TabsContent value="stocktake" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t('operations.stocktake.checkCount')}</p>
                    <p className="text-2xl font-bold">{stocktakeResults.total_checks}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">{t('operations.stocktake.itemsChecked')}</p>
                  <p className="text-2xl font-bold">{stocktakeResults.items_checked}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">{t('operations.stocktake.accuracy')}</p>
                  <p className="text-2xl font-bold text-green-600">{stocktakeResults.accuracy_rate}%</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">{t('operations.stocktake.adjustmentValue')}</p>
                  <p className="text-2xl font-bold">{formatCurrency(stocktakeResults.adjusted_value)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>{t('operations.stocktake.recentResults')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                {t('operations.stocktake.noData')}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* TAB 3: Efficiency */}
        <TabsContent value="efficiency" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">{t('operations.efficiency.avgProcessingTime')}</p>
                  <p className="text-2xl font-bold">{efficiencyMetrics.avg_processing_time}h</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">{t('operations.efficiency.onTime')}</p>
                  <p className="text-2xl font-bold text-green-600">{efficiencyMetrics.on_time_delivery_rate}%</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">{t('operations.efficiency.errorRate')}</p>
                  <p className="text-2xl font-bold text-red-600">{efficiencyMetrics.error_rate}%</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">{t('operations.efficiency.staffProductivity')}</p>
                  <p className="text-2xl font-bold">{efficiencyMetrics.staff_productivity}%</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

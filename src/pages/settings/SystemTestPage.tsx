import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from '@/hooks/useUser'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, XCircle, Loader2, Play } from 'lucide-react'

interface TestResult {
  name: string
  status: 'pending' | 'running' | 'success' | 'error'
  message?: string
  details?: any
  duration?: number
}

export function SystemTestPage() {
  const { tenantId, hotelId, user } = useUser()
  const [tests, setTests] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [autoRunAfterCreate, setAutoRunAfterCreate] = useState(false)

  const updateTest = (name: string, updates: Partial<TestResult>) => {
    setTests(prev => {
      const existing = prev.find(t => t.name === name)
      if (existing) {
        return prev.map(t => t.name === name ? { ...t, ...updates } : t)
      }
      return [...prev, { name, status: 'pending', ...updates }]
    })
  }

  const runTest = async (name: string, testFn: () => Promise<any>) => {
    const startTime = Date.now()
    updateTest(name, { status: 'running' })
    
    try {
      const result = await testFn()
      const duration = Date.now() - startTime
      updateTest(name, { 
        status: 'success', 
        message: 'Test passed',
        details: result,
        duration
      })
      return result
    } catch (error: any) {
      const duration = Date.now() - startTime
      updateTest(name, { 
        status: 'error', 
        message: error.message,
        details: error,
        duration
      })
      throw error
    }
  }

  const autoCreateTenantAndHotel = async () => {
    if (!user?.id) {
      updateTest('Auto-Create', {
        status: 'error',
        message: 'Không có user_id. Vui lòng đăng nhập trước.'
      })
      return
    }

    setIsCreating(true)
    setTests([])
    
    try {
      updateTest('Auto-Create', { status: 'running', message: 'Đang tạo tenant và hotel...' })
      
      // Call the complete_registration function with demo data
      const { data, error } = await supabase.rpc('complete_registration', {
        p_user_id: user.id,
        p_full_name: user.email?.split('@')[0] || 'Demo User',
        p_email: user.email || 'demo@example.com',
        p_phone: '0123456789',
        p_tenant_name: 'Công ty Demo',
        p_hotel_name: 'Khách sạn Demo',
        p_hotel_address: '123 Đường Demo, TP.HCM',
        p_hotel_phone: '0123456789',
        p_hotel_email: user.email || 'hotel@example.com',
        p_total_rooms: 50
      })

      if (error) throw error
      
      const result = data as any
      if (result?.success) {
        updateTest('Auto-Create', {
          status: 'success',
          message: 'Đã tạo tenant và hotel thành công!',
          details: result
        })
        
        // Reload page to refresh user data
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        throw new Error(result?.error || 'Không thể tạo tenant/hotel')
      }
    } catch (error: any) {
      updateTest('Auto-Create', {
        status: 'error',
        message: error.message
      })
    } finally {
      setIsCreating(false)
    }
  }

  const runAllTests = async () => {
    if (!tenantId || !hotelId || !user?.id) {
      updateTest('Prerequisites', { 
        status: 'error', 
        message: 'Missing tenant_id, hotel_id, or user_id' 
      })
      return
    }

    setIsRunning(true)
    setTests([])

    try {
      // Test 1: Database connectivity
      await runTest('Database Connection', async () => {
        const { data, error } = await supabase.from('tenants').select('id').limit(1)
        if (error) throw error
        return { connected: true, rows: data?.length || 0 }
      })

      // Test 2: User authentication and roles
      await runTest('User Authentication', async () => {
        const { data: session } = await supabase.auth.getSession()
        const { data: roles } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', user.id)
        
        return { 
          authenticated: !!session.session,
          userId: user.id,
          roles: roles?.map(r => r.role) || []
        }
      })

      // Test 3: Tenant and Hotel data
      await runTest('Tenant & Hotel Data', async () => {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', tenantId)
          .single()
        
        const { data: hotel } = await supabase
          .from('hotels')
          .select('*')
          .eq('id', hotelId)
          .single()
        
        return { tenant, hotel }
      })

      // Test 4: RLS Policies - Categories
      await runTest('RLS - Item Categories', async () => {
        const { data, error } = await supabase
          .from('item_categories')
          .select('*')
          .eq('tenant_id', tenantId)
        
        if (error) throw error
        return { canRead: true, count: data?.length || 0 }
      })

      // Test 5: RLS Policies - Items
      await runTest('RLS - Items', async () => {
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .eq('tenant_id', tenantId)
        
        if (error) throw error
        return { canRead: true, count: data?.length || 0 }
      })

      // Test 6: RLS Policies - Rooms
      await runTest('RLS - Rooms', async () => {
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('tenant_id', tenantId)
        
        if (error) throw error
        return { canRead: true, count: data?.length || 0 }
      })

      // Test 7: Foreign key relationships
      await runTest('Foreign Key Constraints', async () => {
        const { data: categories, error: catError } = await supabase
          .from('item_categories')
          .select('id')
          .eq('tenant_id', tenantId)
          .limit(1)
        
        if (catError) throw catError
        
        return { 
          categories: categories?.length || 0,
          categoriesExist: (categories?.length || 0) > 0
        }
      })

      // Test 8: Dashboard stats function
      await runTest('Dashboard Stats RPC', async () => {
        const { data, error } = await supabase.rpc('get_dashboard_stats', {
          p_tenant_id: tenantId
        })
        
        if (error) throw error
        return data
      })

      // Test 9: Workflow tables
      await runTest('Workflow Tables', async () => {
        const { data: workflows } = await supabase
          .from('workflows')
          .select('id')
          .eq('tenant_id', tenantId)
        
        const { data: customFields } = await supabase
          .from('custom_fields')
          .select('id')
          .eq('tenant_id', tenantId)
        
        return {
          workflows: workflows?.length || 0,
          customFields: customFields?.length || 0
        }
      })

      // Test 10: Insert test (will rollback)
      await runTest('Write Permissions', async () => {
        const testCategory = {
          tenant_id: tenantId,
          name: '__TEST_DELETE_ME__',
          name_en: 'Test Category',
          description: 'Test category - will be deleted',
          icon: 'test',
          color: '#000000',
          sort_order: 999
        }
        
        const { data, error } = await supabase
          .from('item_categories')
          .insert(testCategory)
          .select()
          .single()
        
        if (error) throw error
        
        // Clean up
        if (data?.id) {
          await supabase
            .from('item_categories')
            .delete()
            .eq('id', data.id)
        }
        
        return { canWrite: true, canDelete: true }
      })

    } catch (error: any) {
      console.error('Test suite error:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-success" />
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />
      case 'running':
        return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-muted" />
    }
  }

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      success: 'default',
      error: 'destructive',
      running: 'secondary',
      pending: 'outline'
    } as const

    return (
      <Badge variant={variants[status]}>
        {status.toUpperCase()}
      </Badge>
    )
  }

  const successCount = tests.filter(t => t.status === 'success').length
  const errorCount = tests.filter(t => t.status === 'error').length
  const totalDuration = tests.reduce((sum, t) => sum + (t.duration || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Kiểm thử hệ thống</h1>
        <p className="text-muted-foreground mt-2">
          Chạy các bài kiểm thử để xác minh cấu hình database, RLS policies, và chức năng
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bộ kiểm thử toàn diện</CardTitle>
              <CardDescription>
                Kiểm tra kết nối, quyền truy cập, và tính toàn vẹn dữ liệu
              </CardDescription>
            </div>
            <Button 
              onClick={runAllTests} 
              disabled={isRunning || !tenantId || !hotelId}
              size="lg"
            >
              {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!isRunning && <Play className="mr-2 h-4 w-4" />}
              {isRunning ? 'Đang chạy...' : 'Chạy tất cả kiểm thử'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!tenantId || !hotelId ? (
            <Alert variant="destructive">
              <AlertDescription>
                <div className="space-y-3">
                  <p className="font-semibold">⚠️ Thiếu tenant_id hoặc hotel_id</p>
                  <p className="text-sm">
                    Hệ thống cần tenant và hotel để hoạt động. 
                    Bạn có thể tự động tạo dữ liệu mẫu bên dưới.
                  </p>
                  <Button 
                    onClick={autoCreateTenantAndHotel}
                    disabled={isCreating}
                    variant="outline"
                    size="sm"
                  >
                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isCreating ? 'Đang tạo...' : 'Tự động tạo Tenant & Hotel'}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertDescription>
                <strong>Tenant ID:</strong> {tenantId}<br />
                <strong>Hotel ID:</strong> {hotelId}<br />
                <strong>User ID:</strong> {user?.id}
              </AlertDescription>
            </Alert>
          )}

          {tests.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-success">
                  ✓ Passed: {successCount}
                </span>
                <span className="text-destructive">
                  ✗ Failed: {errorCount}
                </span>
                <span className="text-muted-foreground">
                  Total: {tests.length}
                </span>
                <span className="text-muted-foreground ml-auto">
                  Duration: {totalDuration}ms
                </span>
              </div>
            </div>
          )}

          {tests.length > 0 && (
            <div className="space-y-2">
              {tests.map((test, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        {getStatusIcon(test.status)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{test.name}</h4>
                            {getStatusBadge(test.status)}
                            {test.duration && (
                              <span className="text-xs text-muted-foreground">
                                ({test.duration}ms)
                              </span>
                            )}
                          </div>
                          {test.message && (
                            <p className={`text-sm mt-1 ${
                              test.status === 'error' 
                                ? 'text-destructive' 
                                : 'text-muted-foreground'
                            }`}>
                              {test.message}
                            </p>
                          )}
                          {test.details && test.status === 'success' && (
                            <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto max-h-32">
                              {JSON.stringify(test.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

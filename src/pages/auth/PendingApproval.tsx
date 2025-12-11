import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Mail, Phone, LogOut, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { useTenantApprovalStatus } from '@/hooks/useTenantApprovalStatus'

const PendingApproval = () => {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const { isApproved, isRejected, isLoading } = useTenantApprovalStatus()

  useEffect(() => {
    if (isApproved) {
      navigate('/', { replace: true })
    }
    if (isRejected) {
      navigate('/rejected', { replace: true })
    }
  }, [isApproved, isRejected, navigate])

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth/login')
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="text-2xl">Tài khoản đang chờ phê duyệt</CardTitle>
          <CardDescription className="mt-2">
            Cảm ơn bạn đã đăng ký! Chúng tôi đang xem xét thông tin của bạn.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-muted p-4">
            <h3 className="font-medium mb-2">Điều gì sẽ xảy ra tiếp theo?</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                Quản trị viên sẽ xem xét thông tin đăng ký của bạn
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                Bạn sẽ nhận được email thông báo khi tài khoản được phê duyệt
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                Thời gian xử lý thường từ 1-2 ngày làm việc
              </li>
            </ul>
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="font-medium mb-3">Cần hỗ trợ?</h3>
            <div className="space-y-2 text-sm">
              <a 
                href="mailto:support@roomweave.com" 
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
              >
                <Mail className="h-4 w-4" />
                support@roomweave.com
              </a>
              <a 
                href="tel:+84123456789" 
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
              >
                <Phone className="h-4 w-4" />
                +84 123 456 789
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isLoading}
              className="w-full"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Kiểm tra trạng thái
            </Button>
            <Button 
              variant="ghost" 
              onClick={handleSignOut}
              className="w-full text-muted-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Đăng xuất
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Trang này sẽ tự động cập nhật khi tài khoản của bạn được phê duyệt
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default PendingApproval

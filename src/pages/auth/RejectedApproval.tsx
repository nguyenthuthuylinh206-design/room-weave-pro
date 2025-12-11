import { useNavigate } from 'react-router-dom'
import { XCircle, Mail, Phone, LogOut, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { useTenantApprovalStatus } from '@/hooks/useTenantApprovalStatus'

const RejectedApproval = () => {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const { rejectionReason } = useTenantApprovalStatus()

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth/login')
  }

  const handleRegisterAgain = async () => {
    await signOut()
    navigate('/auth/register')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Đăng ký không được phê duyệt</CardTitle>
          <CardDescription className="mt-2">
            Rất tiếc, yêu cầu đăng ký của bạn chưa được chấp nhận.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {rejectionReason && (
            <div className="rounded-lg bg-destructive/10 p-4 border border-destructive/20">
              <h3 className="font-medium mb-2 text-destructive">Lý do từ chối:</h3>
              <p className="text-sm text-muted-foreground">{rejectionReason}</p>
            </div>
          )}

          <div className="rounded-lg bg-muted p-4">
            <h3 className="font-medium mb-2">Bạn có thể làm gì?</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                Liên hệ với chúng tôi để biết thêm chi tiết
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                Kiểm tra và cập nhật thông tin đăng ký
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                Đăng ký lại với thông tin chính xác hơn
              </li>
            </ul>
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="font-medium mb-3">Liên hệ hỗ trợ</h3>
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
            <Button onClick={handleRegisterAgain} className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" />
              Đăng ký lại
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
        </CardContent>
      </Card>
    </div>
  )
}

export default RejectedApproval

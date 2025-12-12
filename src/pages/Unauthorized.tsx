import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { ShieldAlert, LogOut, Home, MessageCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export default function Unauthorized() {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth/login')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4">
            <ShieldAlert className="h-16 w-16 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold">Không có quyền truy cập</h1>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Tài khoản của bạn chưa được cấp quyền truy cập vào hệ thống.
          </p>
          
          {/* Thông báo liên hệ quản lý */}
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 text-left">
            <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Cần hỗ trợ?
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Vui lòng liên hệ với <strong>Quản lý</strong> hoặc <strong>Chủ khách sạn</strong> để được cấp quyền truy cập phù hợp với công việc của bạn.
            </p>
          </div>

          {/* Hiển thị email đang đăng nhập */}
          {user?.email && (
            <p className="text-sm text-muted-foreground">
              Đang đăng nhập với: <strong className="text-foreground">{user.email}</strong>
            </p>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          {/* Nút đăng xuất - nổi bật */}
          <Button onClick={handleSignOut} className="w-full" variant="default">
            <LogOut className="mr-2 h-4 w-4" />
            Đăng xuất & Đổi tài khoản
          </Button>
          
          {/* Nút về trang chủ - secondary */}
          <Button asChild variant="outline" className="w-full">
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Thử lại với trang chủ
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <h1 className="text-9xl font-bold text-muted-foreground">404</h1>
      <h2 className="mt-4 text-2xl font-semibold">Không tìm thấy trang</h2>
      <p className="mt-2 text-muted-foreground">
        Trang bạn đang tìm kiếm không tồn tại.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">
          <Home className="mr-2 h-4 w-4" />
          Về trang chủ
        </Link>
      </Button>
    </div>
  )
}

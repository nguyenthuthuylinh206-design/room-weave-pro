import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ShieldAlert, Home } from 'lucide-react'

export default function Unauthorized() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <ShieldAlert className="h-24 w-24 text-destructive" />
      <h1 className="mt-6 text-3xl font-bold">Không có quyền truy cập</h1>
      <p className="mt-2 text-muted-foreground">
        Bạn không có quyền truy cập trang này.
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

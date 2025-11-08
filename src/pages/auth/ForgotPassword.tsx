import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const { resetPassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await resetPassword(email)
    
    if (!error) {
      setSubmitted(true)
    }
    
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Kiểm tra email</CardTitle>
            <CardDescription>
              Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến email của bạn.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full">
              <Link to="/auth/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Quay lại đăng nhập
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Quên mật khẩu</CardTitle>
          <CardDescription>
            Nhập email của bạn để nhận hướng dẫn đặt lại mật khẩu
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Đang gửi...' : 'Gửi hướng dẫn'}
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link to="/auth/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Quay lại đăng nhập
              </Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

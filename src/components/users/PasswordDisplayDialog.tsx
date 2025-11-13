import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Copy, Check, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

interface PasswordDisplayDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  email: string
  password: string
  userName: string
}

export function PasswordDisplayDialog({
  open,
  onOpenChange,
  email,
  password,
  userName,
}: PasswordDisplayDialogProps) {
  const [copied, setCopied] = useState(false)
  const [showPassword, setShowPassword] = useState(true)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      toast.success('Đã sao chép mật khẩu')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Không thể sao chép mật khẩu')
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset state when closing
    setTimeout(() => {
      setCopied(false)
      setShowPassword(true)
    }, 300)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Thông tin đăng nhập
          </DialogTitle>
          <DialogDescription>
            Tài khoản cho <strong>{userName}</strong> đã được tạo thành công
          </DialogDescription>
        </DialogHeader>

        <Alert variant="default" className="border-warning/50 bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-sm">
            <strong>Quan trọng:</strong> Hãy lưu hoặc gửi thông tin đăng nhập này cho người dùng ngay. 
            Mật khẩu sẽ không hiển thị lại sau khi đóng cửa sổ này.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email đăng nhập</Label>
            <Input
              id="email"
              value={email}
              readOnly
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu tạm thời</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  readOnly
                  className="bg-muted pr-10 font-mono"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Người dùng có thể đổi mật khẩu sau khi đăng nhập lần đầu
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={handleClose}>
            Đã lưu thông tin
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

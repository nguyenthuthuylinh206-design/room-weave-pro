import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { UserWithRelations } from '@/types/database.types'
import { AlertTriangle, Shield, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useHasSubordinates } from '@/hooks/useSubordinates'

interface ChangeLevelDialogProps {
  user: UserWithRelations | null
  newLevel: 'tenant_owner' | 'manager' | 'staff'
  currentLevel: 'tenant_owner' | 'manager' | 'staff'
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

const levelLabels = {
  tenant_owner: 'Chủ sở hữu',
  manager: 'Quản lý',
  staff: 'Nhân viên',
}

const levelDescriptions = {
  tenant_owner: 'Toàn quyền trong hệ thống, có thể tạo và quản lý tất cả người dùng',
  manager: 'Quản lý khách sạn, có thể tạo Quản lý và Nhân viên',
  staff: 'Nhân viên thực hiện công việc hàng ngày, không có quyền tạo người dùng khác',
}

export function ChangeLevelDialog({
  user,
  newLevel,
  currentLevel,
  open,
  onOpenChange,
  onConfirm,
}: ChangeLevelDialogProps) {
  const { data: hasSubordinates, isLoading: checkingSubordinates } = useHasSubordinates(user?.id || '')
  const [isChanging, setIsChanging] = useState(false)

  const handleConfirm = async () => {
    setIsChanging(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (error) {
      // Error is handled by parent
    } finally {
      setIsChanging(false)
    }
  }

  if (!user) return null

  const isDowngrade = 
    (currentLevel === 'tenant_owner' && newLevel !== 'tenant_owner') ||
    (currentLevel === 'manager' && newLevel === 'staff')

  const isUpgrade = 
    (currentLevel === 'staff' && newLevel !== 'staff') ||
    (currentLevel === 'manager' && newLevel === 'tenant_owner')

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Xác nhận thay đổi cấp bậc
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Bạn đang thay đổi cấp bậc của <strong className="text-foreground">{user.full_name}</strong>:
              </p>

              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Cấp bậc hiện tại:</span>
                  <span className="font-medium">{levelLabels[currentLevel]}</span>
                </div>
                <div className="flex items-center justify-center text-muted-foreground">
                  ↓
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Cấp bậc mới:</span>
                  <span className="font-medium text-primary">{levelLabels[newLevel]}</span>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{levelLabels[newLevel]}:</strong> {levelDescriptions[newLevel]}
                </AlertDescription>
              </Alert>

              {isDowngrade && hasSubordinates && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Cảnh báo:</strong> Người dùng này đang quản lý các tài khoản khác. 
                    Việc hạ cấp sẽ chuyển quyền quản lý các tài khoản đó cho người khác.
                  </AlertDescription>
                </Alert>
              )}

              {isUpgrade && (
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Người dùng sẽ nhận thêm quyền hạn mới. 
                    Đảm bảo rằng họ đã được đào tạo về các trách nhiệm tương ứng.
                  </AlertDescription>
                </Alert>
              )}

              {checkingSubordinates && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang kiểm tra tác động...
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                Thay đổi cấp bậc sẽ có hiệu lực ngay lập tức.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isChanging}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isChanging || checkingSubordinates}
          >
            {isChanging ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang thay đổi...
              </>
            ) : (
              'Xác nhận thay đổi'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

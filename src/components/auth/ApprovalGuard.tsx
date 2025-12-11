import { ReactNode, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTenantApprovalStatus } from '@/hooks/useTenantApprovalStatus'
import { Loader2 } from 'lucide-react'

interface ApprovalGuardProps {
  children: ReactNode
}

export function ApprovalGuard({ children }: ApprovalGuardProps) {
  const navigate = useNavigate()
  const { 
    status, 
    isPending, 
    isRejected, 
    isLoading, 
    userLevelCode 
  } = useTenantApprovalStatus()

  useEffect(() => {
    // Skip check for super_admin - they don't need approval
    if (userLevelCode === 'super_admin') {
      return
    }

    // Only check approval for tenant_owner
    // Manager and Staff don't need approval (they belong to already approved tenants)
    if (userLevelCode !== 'tenant_owner') {
      return
    }

    // Redirect based on approval status
    if (!isLoading && status) {
      if (isPending) {
        navigate('/pending-approval', { replace: true })
      } else if (isRejected) {
        navigate('/rejected', { replace: true })
      }
    }
  }, [status, isPending, isRejected, isLoading, userLevelCode, navigate])

  // Show loading while checking status for tenant_owner
  if (isLoading && userLevelCode === 'tenant_owner') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Đang kiểm tra trạng thái tài khoản...</p>
        </div>
      </div>
    )
  }

  // Block access if pending or rejected (for tenant_owner only)
  if (userLevelCode === 'tenant_owner' && (isPending || isRejected)) {
    return null
  }

  return <>{children}</>
}

import { useState } from 'react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Check, X, Clock, Building2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { usePendingTenants, useApproveTenant, useRejectTenant } from '@/hooks/super-admin/useTenantApproval'
import { useAuth } from '@/hooks/useAuth'

export default function TenantApprovalPage() {
  const { user } = useAuth()
  const { data: pendingTenants, isLoading } = usePendingTenants()
  const approveMutation = useApproveTenant()
  const rejectMutation = useRejectTenant()

  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean
    tenantId: string
    tenantName: string
  }>({
    open: false,
    tenantId: '',
    tenantName: '',
  })
  const [rejectionReason, setRejectionReason] = useState('')

  const handleApprove = (tenantId: string) => {
    if (!user?.id) return
    approveMutation.mutate({ tenantId, adminId: user.id })
  }

  const handleRejectClick = (tenantId: string, tenantName: string) => {
    setRejectDialog({ open: true, tenantId, tenantName })
    setRejectionReason('')
  }

  const handleRejectConfirm = () => {
    if (!user?.id || !rejectDialog.tenantId) return
    rejectMutation.mutate({
      tenantId: rejectDialog.tenantId,
      adminId: user.id,
      reason: rejectionReason,
    })
    setRejectDialog({ open: false, tenantId: '', tenantName: '' })
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Phê Duyệt Doanh Nghiệp</h1>
          <p className="text-muted-foreground mt-2">
            Xét duyệt các đăng ký tài khoản Chủ sở hữu mới
          </p>
        </div>

        <Card>
...
          </CardContent>
        </Card>
      </div>

      <Dialog open={rejectDialog.open} onOpenChange={(open) => 
        setRejectDialog({ ...rejectDialog, open })
      }>
...
        </DialogContent>
      </Dialog>
    </>
  )
}

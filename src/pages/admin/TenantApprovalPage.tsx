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
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Phê Duyệt Doanh Nghiệp</h1>
        <p className="text-muted-foreground mt-2">
          Xét duyệt các đăng ký tài khoản Chủ sở hữu mới
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Danh Sách Chờ Phê Duyệt
          </CardTitle>
          <CardDescription>
            Các doanh nghiệp đã đăng ký và đang chờ Super Admin phê duyệt
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner />
          ) : !pendingTenants || pendingTenants.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Không có yêu cầu chờ duyệt"
              description="Hiện tại không có doanh nghiệp nào đang chờ phê duyệt"
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên Doanh Nghiệp</TableHead>
                    <TableHead>Chủ Sở Hữu</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Gói</TableHead>
                    <TableHead>Ngày Đăng Ký</TableHead>
                    <TableHead className="text-right">Hành Động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingTenants.map((tenant) => (
                    <TableRow key={tenant.tenant_id}>
                      <TableCell className="font-medium">
                        {tenant.tenant_name}
                      </TableCell>
                      <TableCell>{tenant.owner_name}</TableCell>
                      <TableCell>{tenant.owner_email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {tenant.subscription_tier}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(tenant.created_at), 'dd/MM/yyyy HH:mm', {
                          locale: vi,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApprove(tenant.tenant_id)}
                            disabled={approveMutation.isPending}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Phê Duyệt
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              handleRejectClick(tenant.tenant_id, tenant.tenant_name)
                            }
                            disabled={rejectMutation.isPending}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Từ Chối
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={rejectDialog.open} onOpenChange={(open) => 
        setRejectDialog({ ...rejectDialog, open })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác Nhận Từ Chối</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn từ chối doanh nghiệp "{rejectDialog.tenantName}"?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Lý do từ chối</Label>
              <Textarea
                id="reason"
                placeholder="Nhập lý do từ chối..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialog({ open: false, tenantId: '', tenantName: '' })}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
            >
              Xác Nhận Từ Chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

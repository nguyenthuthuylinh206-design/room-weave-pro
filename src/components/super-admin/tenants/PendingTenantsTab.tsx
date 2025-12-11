import { useState } from 'react';
import { usePendingTenants, useApproveTenant, useRejectTenant } from '@/hooks/super-admin/useTenantApproval';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Check, X, Clock, Building2, Mail, User, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export function PendingTenantsTab() {
  const { user } = useAuth();
  const { data: pendingTenants, isLoading } = usePendingTenants();
  const approveMutation = useApproveTenant();
  const rejectMutation = useRejectTenant();

  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    tenantId: string;
    tenantName: string;
  }>({ open: false, tenantId: '', tenantName: '' });
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = (tenantId: string) => {
    if (!user?.id) return;
    approveMutation.mutate({ tenantId, adminId: user.id });
  };

  const handleRejectClick = (tenantId: string, tenantName: string) => {
    setRejectDialog({ open: true, tenantId, tenantName });
    setRejectionReason('');
  };

  const handleRejectConfirm = () => {
    if (!user?.id || !rejectDialog.tenantId) return;
    rejectMutation.mutate(
      {
        tenantId: rejectDialog.tenantId,
        adminId: user.id,
        reason: rejectionReason || 'Không đáp ứng yêu cầu',
      },
      {
        onSuccess: () => {
          setRejectDialog({ open: false, tenantId: '', tenantName: '' });
          setRejectionReason('');
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!pendingTenants || pendingTenants.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-green-100 p-4 mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold">Không có yêu cầu chờ duyệt</h3>
          <p className="text-muted-foreground mt-1">
            Tất cả đăng ký đã được xử lý
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Đăng ký chờ phê duyệt
              <Badge variant="secondary" className="ml-2">
                {pendingTenants.length}
              </Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Doanh nghiệp</TableHead>
                <TableHead>Chủ sở hữu</TableHead>
                <TableHead>Gói đăng ký</TableHead>
                <TableHead>Ngày đăng ký</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingTenants.map((tenant) => (
                <TableRow key={tenant.tenant_id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{tenant.tenant_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{tenant.owner_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {tenant.owner_email}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{tenant.subscription_tier}</Badge>
                  </TableCell>
                  <TableCell>
                    {formatDate(tenant.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(tenant.tenant_id)}
                        disabled={approveMutation.isPending}
                      >
                        {approveMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 mr-1" />
                        )}
                        Duyệt
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
                        Từ chối
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) =>
          !open && setRejectDialog({ open: false, tenantId: '', tenantName: '' })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối đăng ký</DialogTitle>
            <DialogDescription>
              Bạn đang từ chối đăng ký của "{rejectDialog.tenantName}". Vui lòng
              nhập lý do từ chối.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Lý do từ chối (không bắt buộc)"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setRejectDialog({ open: false, tenantId: '', tenantName: '' })
              }
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

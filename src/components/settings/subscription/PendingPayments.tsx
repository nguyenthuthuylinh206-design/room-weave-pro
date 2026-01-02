import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Clock, CheckCircle, XCircle, QrCode, RefreshCw } from 'lucide-react';
import { formatVNCurrency } from '@/lib/pricing';
import { usePendingPayments, type PendingPayment } from '@/hooks/usePendingPayments';
import { ViewPaymentQRDialog } from '@/components/payment/ViewPaymentQRDialog';

export function PendingPayments() {
  const { data: payments, isLoading, refetch, isRefetching } = usePendingPayments();
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const pendingPayments = payments?.filter(p => p.payment_status === 'pending') || [];
  const recentPayments = payments?.filter(p => p.payment_status !== 'pending').slice(0, 5) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="h-3 w-3 mr-1" /> Chờ xác nhận
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" /> Đã thanh toán
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" /> Từ chối
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleViewQR = (payment: PendingPayment) => {
    setSelectedPayment(payment);
    setIsDialogOpen(true);
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

  return (
    <>
      <div className="space-y-6">
        {/* Pending Payments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Đang chờ thanh toán
                  {pendingPayments.length > 0 && (
                    <Badge variant="secondary">{pendingPayments.length}</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Các giao dịch đang chờ xác nhận từ quản trị viên
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isRefetching}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
                Làm mới
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {pendingPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Không có giao dịch nào đang chờ xác nhận</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã đơn hàng</TableHead>
                    <TableHead>Số tiền</TableHead>
                    <TableHead>Nội dung CK</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-sm">
                        {payment.invoice?.invoice_number || payment.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        {formatVNCurrency(payment.amount)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {payment.transaction_reference}
                      </TableCell>
                      <TableCell>
                        {new Date(payment.created_at).toLocaleString('vi-VN')}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(payment.payment_status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewQR(payment)}
                        >
                          <QrCode className="h-4 w-4 mr-2" />
                          Xem QR
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Completed/Failed Payments */}
        {recentPayments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Giao dịch gần đây</CardTitle>
              <CardDescription>
                Các giao dịch đã xử lý gần nhất
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã đơn hàng</TableHead>
                    <TableHead>Số tiền</TableHead>
                    <TableHead>Ngày xử lý</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Chi tiết</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-sm">
                        {payment.invoice?.invoice_number || payment.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        {formatVNCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        {payment.payment_date
                          ? new Date(payment.payment_date).toLocaleString('vi-VN')
                          : new Date(payment.created_at).toLocaleString('vi-VN')}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(payment.payment_status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewQR(payment)}
                        >
                          Xem chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      <ViewPaymentQRDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        payment={selectedPayment}
      />
    </>
  );
}

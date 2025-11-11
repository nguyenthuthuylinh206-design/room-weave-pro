import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePaymentTransactions, useInvoices } from "@/hooks/useSubscription";
import { formatDate } from "date-fns";
import { vi } from "date-fns/locale";
import { Download, FileText, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function BillingHistory() {
  const { data: transactions, isLoading: loadingTransactions } = usePaymentTransactions();
  const { data: invoices, isLoading: loadingInvoices } = useInvoices();

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    completed: { label: "Hoàn thành", variant: "default" },
    pending: { label: "Đang xử lý", variant: "secondary" },
    failed: { label: "Thất bại", variant: "destructive" },
    refunded: { label: "Đã hoàn tiền", variant: "outline" },
  };

  if (loadingTransactions) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Lịch sử thanh toán</CardTitle>
          <CardDescription>
            Danh sách tất cả các giao dịch thanh toán của bạn
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!transactions || transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Chưa có giao dịch nào
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead>Phương thức</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => {
                  const status = statusConfig[transaction.payment_status] || statusConfig.pending;
                  
                  return (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {transaction.payment_date
                          ? formatDate(new Date(transaction.payment_date), 'dd/MM/yyyy HH:mm', { locale: vi })
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell>
                        {typeof transaction.metadata === 'object' && transaction.metadata !== null 
                          ? (transaction.metadata as any).description || 'Thanh toán đăng ký'
                          : 'Thanh toán đăng ký'}
                      </TableCell>
                      <TableCell className="capitalize">
                        {transaction.payment_method || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {transaction.amount.toLocaleString('vi-VN')}đ
                      </TableCell>
                      <TableCell className="text-right">
                        {transaction.invoice_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Xem hóa đơn
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Hóa đơn</CardTitle>
          <CardDescription>
            Danh sách tất cả các hóa đơn đã phát hành
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingInvoices ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !invoices || invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Chưa có hóa đơn nào
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Số hóa đơn</TableHead>
                  <TableHead>Ngày phát hành</TableHead>
                  <TableHead>Ngày đáo hạn</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Tổng tiền</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-sm">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell>
                      {formatDate(new Date(invoice.invoice_date), 'dd/MM/yyyy', { locale: vi })}
                    </TableCell>
                    <TableCell>
                      {formatDate(new Date(invoice.due_date), 'dd/MM/yyyy', { locale: vi })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                        {invoice.status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {invoice.total_amount.toLocaleString('vi-VN')}đ
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" disabled>
                        <Download className="h-4 w-4 mr-1" />
                        Tải xuống
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

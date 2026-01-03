import { useEffect, useState } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { usePaymentTransactions, useInvoices } from "@/hooks/useSubscription";
import { formatDate } from "date-fns";
import { vi } from "date-fns/locale";
import { FileText, Loader2, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from '@/integrations/supabase/client';
import { formatVNCurrency } from '@/lib/pricing';
import { Separator } from '@/components/ui/separator';

export function BillingHistory() {
  const { data: transactions, isLoading: loadingTransactions, refetch: refetchTransactions } = usePaymentTransactions();
  const { data: invoices, isLoading: loadingInvoices, refetch: refetchInvoices } = useInvoices();
  const [selectedInvoice, setSelectedInvoice] = useState<typeof invoices extends (infer T)[] | null | undefined ? T : never>(null);

  // Realtime subscription for payment updates
  useEffect(() => {
    const channel = supabase
      .channel('billing-history-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_transactions' },
        () => refetchTransactions()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices' },
        () => refetchInvoices()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchTransactions, refetchInvoices]);

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
                        {formatVNCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {transaction.invoice_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const inv = invoices?.find(i => i.id === transaction.invoice_id);
                              if (inv) setSelectedInvoice(inv);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Chi tiết
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
                      {formatVNCurrency(invoice.total_amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedInvoice(invoice)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Chi tiết
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invoice Detail Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Hóa đơn {selectedInvoice?.invoice_number}
            </DialogTitle>
            <DialogDescription>
              Chi tiết hóa đơn và thông tin thanh toán
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Ngày phát hành:</span>
                  <p className="font-medium">
                    {formatDate(new Date(selectedInvoice.invoice_date), 'dd/MM/yyyy', { locale: vi })}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Ngày đáo hạn:</span>
                  <p className="font-medium">
                    {formatDate(new Date(selectedInvoice.due_date), 'dd/MM/yyyy', { locale: vi })}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Trạng thái:</span>
                  <div className="mt-1">
                    <Badge variant={selectedInvoice.status === 'paid' ? 'default' : 'secondary'}>
                      {selectedInvoice.status === 'paid' ? 'Đã thanh toán' : 
                       selectedInvoice.status === 'cancelled' ? 'Đã hủy' : 'Chưa thanh toán'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Thời hạn:</span>
                  <p className="font-medium">
                    {formatDate(new Date(selectedInvoice.period_start), 'dd/MM/yyyy', { locale: vi })} - {formatDate(new Date(selectedInvoice.period_end), 'dd/MM/yyyy', { locale: vi })}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tạm tính:</span>
                  <span>{formatVNCurrency(selectedInvoice.subtotal)}</span>
                </div>
                {selectedInvoice.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Giảm giá:</span>
                    <span>-{formatVNCurrency(selectedInvoice.discount_amount)}</span>
                  </div>
                )}
                {selectedInvoice.tax_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Thuế:</span>
                    <span>{formatVNCurrency(selectedInvoice.tax_amount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold text-base">
                  <span>Tổng cộng:</span>
                  <span className="text-primary">{formatVNCurrency(selectedInvoice.total_amount)}</span>
                </div>
              </div>

              {selectedInvoice.notes && (
                <>
                  <Separator />
                  <div className="text-sm">
                    <span className="text-muted-foreground">Ghi chú:</span>
                    <p className="mt-1">{selectedInvoice.notes}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

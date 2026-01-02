import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle, XCircle, Clock, Search, CreditCard, Building2 } from 'lucide-react';
import { formatVNCurrency } from '@/lib/pricing';
import { toast } from 'sonner';
import { BankPaymentSettings } from '@/components/super-admin/settings/BankPaymentSettings';

interface PaymentTransaction {
  id: string;
  tenant_id: string;
  invoice_id: string | null;
  amount: number;
  payment_method: string;
  payment_status: string;
  transaction_reference: string | null;
  notes: string | null;
  created_at: string;
  payment_date: string | null;
  metadata: Record<string, unknown>;
  tenant?: {
    name: string;
    contact_email: string;
  };
  invoice?: {
    invoice_number: string;
    status: string;
  };
}

export function PaymentSettingsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('pending');
  const queryClient = useQueryClient();

  // Fetch payments
  const { data: payments, isLoading } = useQuery({
    queryKey: ['admin-payments', selectedTab],
    queryFn: async () => {
      let query = supabase
        .from('payment_transactions')
        .select(`
          *,
          tenant:tenants(name, contact_email),
          invoice:invoices(invoice_number, status)
        `)
        .eq('payment_method', 'bank_transfer')
        .order('created_at', { ascending: false });

      if (selectedTab === 'pending') {
        query = query.eq('payment_status', 'pending');
      } else if (selectedTab === 'completed') {
        query = query.eq('payment_status', 'completed');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as PaymentTransaction[];
    },
  });

  // Confirm payment mutation
  const confirmPaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase
        .from('payment_transactions')
        .update({
          payment_status: 'completed',
          payment_date: new Date().toISOString(),
        })
        .eq('id', paymentId);

      if (error) throw error;

      // Also update the invoice status
      const payment = payments?.find(p => p.id === paymentId);
      if (payment?.invoice_id) {
        await supabase
          .from('invoices')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
          })
          .eq('id', payment.invoice_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      toast.success('Đã xác nhận thanh toán');
    },
    onError: (error) => {
      console.error('Error confirming payment:', error);
      toast.error('Không thể xác nhận thanh toán');
    },
  });

  // Reject payment mutation
  const rejectPaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase
        .from('payment_transactions')
        .update({
          payment_status: 'failed',
        })
        .eq('id', paymentId);

      if (error) throw error;

      // Also update the invoice status
      const payment = payments?.find(p => p.id === paymentId);
      if (payment?.invoice_id) {
        await supabase
          .from('invoices')
          .update({
            status: 'cancelled',
          })
          .eq('id', payment.invoice_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      toast.success('Đã từ chối thanh toán');
    },
    onError: (error) => {
      console.error('Error rejecting payment:', error);
      toast.error('Không thể từ chối thanh toán');
    },
  });

  const filteredPayments = payments?.filter(payment => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      payment.transaction_reference?.toLowerCase().includes(search) ||
      payment.tenant?.name?.toLowerCase().includes(search) ||
      payment.tenant?.contact_email?.toLowerCase().includes(search) ||
      payment.invoice?.invoice_number?.toLowerCase().includes(search)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Clock className="h-3 w-3 mr-1" /> Chờ xác nhận</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" /> Đã thanh toán</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" /> Từ chối</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Quản lý thanh toán
          </h1>
          <p className="text-muted-foreground">
            Xác nhận thanh toán và cấu hình tài khoản ngân hàng
          </p>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Chờ xác nhận
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Đã thanh toán
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Building2 className="h-4 w-4" />
            Cài đặt ngân hàng
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Giao dịch chờ xác nhận</CardTitle>
              <CardDescription>
                Kiểm tra và xác nhận các giao dịch chuyển khoản ngân hàng
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm theo mã, tên tenant..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredPayments?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Không có giao dịch nào chờ xác nhận
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã giao dịch</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Số tiền</TableHead>
                      <TableHead>Nội dung CK</TableHead>
                      <TableHead>Ngày tạo</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments?.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-sm">
                          {payment.invoice?.invoice_number || payment.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{payment.tenant?.name}</div>
                            <div className="text-sm text-muted-foreground">{payment.tenant?.contact_email}</div>
                          </div>
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
                          <div className="flex justify-end gap-2">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="default">
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Xác nhận
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Xác nhận thanh toán</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Bạn đã kiểm tra và xác nhận tenant đã chuyển khoản {formatVNCurrency(payment.amount)} với nội dung "{payment.transaction_reference}"?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => confirmPaymentMutation.mutate(payment.id)}
                                  >
                                    Xác nhận
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive">
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Từ chối
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Từ chối thanh toán</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Bạn có chắc chắn muốn từ chối giao dịch này? Đơn hàng sẽ bị hủy.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => rejectPaymentMutation.mutate(payment.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Từ chối
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lịch sử thanh toán</CardTitle>
              <CardDescription>
                Danh sách các giao dịch đã được xác nhận
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm theo mã, tên tenant..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredPayments?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Không có giao dịch nào
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã giao dịch</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Số tiền</TableHead>
                      <TableHead>Nội dung CK</TableHead>
                      <TableHead>Ngày thanh toán</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments?.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-sm">
                          {payment.invoice?.invoice_number || payment.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{payment.tenant?.name}</div>
                            <div className="text-sm text-muted-foreground">{payment.tenant?.contact_email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-primary">
                          {formatVNCurrency(payment.amount)}
                        </TableCell>
                        <TableCell className="font-mono">
                          {payment.transaction_reference}
                        </TableCell>
                        <TableCell>
                          {payment.payment_date 
                            ? new Date(payment.payment_date).toLocaleString('vi-VN')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(payment.payment_status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <BankPaymentSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

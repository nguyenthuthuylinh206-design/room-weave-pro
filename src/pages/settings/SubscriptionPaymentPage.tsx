import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBankPaymentSettings } from '@/hooks/useBankPaymentSettings';
import { BankQRCode } from '@/components/payment/BankQRCode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { formatVNCurrency } from '@/lib/pricing';

export default function SubscriptionPaymentPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const { data: bankSettings, isLoading: isLoadingBank } = useBankPaymentSettings();

  // Fetch payment transaction with invoice
  const { data: payment, isLoading, error } = useQuery({
    queryKey: ['payment-transaction', invoiceId],
    queryFn: async () => {
      if (!invoiceId) throw new Error('Missing invoiceId');

      const { data, error } = await supabase
        .from('payment_transactions')
        .select(`
          *,
          invoice:invoices(*)
        `)
        .eq('invoice_id', invoiceId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId,
    refetchInterval: 10000, // Refetch every 10s to check for status updates
  });

  const handleBack = () => {
    navigate('/settings/subscription');
  };

  if (isLoading || isLoadingBank) {
    return (
      <div className="container mx-auto py-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Đang tải thông tin thanh toán...</p>
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="container mx-auto py-6">
        <Card className="max-w-lg mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Không tìm thấy đơn hàng
            </CardTitle>
            <CardDescription>
              Đơn hàng không tồn tại hoặc bạn không có quyền truy cập.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleBack} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại quản lý đăng ký
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const paymentStatus = payment.payment_status as string;
  const paymentContent = payment.transaction_reference || '';
  const amount = payment.amount || 0;
  const invoice = payment.invoice as Record<string, unknown> | null;

  // Success state
  if (paymentStatus === 'completed') {
    return (
      <div className="container mx-auto py-6">
        <Card className="max-w-lg mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-green-600">Thanh toán thành công!</CardTitle>
            <CardDescription>
              Cảm ơn bạn đã thanh toán. Gói dịch vụ đã được kích hoạt.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Số tiền</span>
                <span className="font-medium">{formatVNCurrency(amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mã thanh toán</span>
                <span className="font-mono">{paymentContent}</span>
              </div>
              {payment.payment_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Xác nhận lúc</span>
                  <span>{new Date(payment.payment_date).toLocaleString('vi-VN')}</span>
                </div>
              )}
            </div>
            <Button onClick={handleBack} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại quản lý đăng ký
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Failed state
  if (paymentStatus === 'failed') {
    return (
      <div className="container mx-auto py-6">
        <Card className="max-w-lg mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Thanh toán bị từ chối</CardTitle>
            <CardDescription>
              Giao dịch của bạn không thể hoàn tất. Vui lòng liên hệ hỗ trợ nếu cần giúp đỡ.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {payment.notes && (
              <Alert variant="destructive">
                <AlertDescription>{payment.notes}</AlertDescription>
              </Alert>
            )}
            <Button onClick={handleBack} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại quản lý đăng ký
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pending state - show QR Code
  if (!bankSettings) {
    return (
      <div className="container mx-auto py-6">
        <Card className="max-w-lg mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Không tìm thấy thông tin ngân hàng
            </CardTitle>
            <CardDescription>
              Cấu hình thanh toán ngân hàng chưa được thiết lập.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleBack} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại quản lý đăng ký
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-lg">
      <div className="mb-6">
        <Button variant="ghost" onClick={handleBack} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>
        <h1 className="text-2xl font-bold">Thanh toán đơn hàng</h1>
        <p className="text-muted-foreground">
          {invoice?.notes as string || 'Quét mã QR để thanh toán'}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-amber-600">
            <Clock className="h-5 w-5" />
            <CardTitle className="text-base">Đang chờ thanh toán</CardTitle>
          </div>
          <CardDescription>
            Vui lòng chuyển khoản theo thông tin bên dưới
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <BankQRCode
            bankCode={bankSettings.bank_code}
            bankName={bankSettings.bank_name}
            accountNumber={bankSettings.account_number}
            accountHolder={bankSettings.account_holder}
            amount={amount}
            paymentContent={paymentContent}
            qrTemplate={bankSettings.qr_template}
          />

          <Alert>
            <AlertDescription className="text-sm">
              Sau khi chuyển khoản, hệ thống sẽ tự động xác nhận trong vài phút. 
              Trang này sẽ tự động cập nhật trạng thái.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

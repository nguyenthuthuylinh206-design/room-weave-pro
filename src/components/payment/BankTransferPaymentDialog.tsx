import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BankQRCode } from './BankQRCode';
import { useSuperAdminBankPaymentSettings } from '@/hooks/useBankPaymentSettings';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/hooks/useUser';
import { toast } from 'sonner';

interface BankTransferPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  description: string;
  onPaymentCreated?: (invoiceId: string) => void;
  autoCreateInvoice?: boolean;
  metadata?: Record<string, unknown>;
}

export function BankTransferPaymentDialog({
  open,
  onOpenChange,
  amount,
  description,
  onPaymentCreated,
  autoCreateInvoice = false,
  metadata = {},
}: BankTransferPaymentDialogProps) {
  const { data: bankSettings, isLoading: isLoadingSettings } = useSuperAdminBankPaymentSettings();
  const { tenantId } = useUser();
  const [paymentContent, setPaymentContent] = useState('');
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [invoiceCreated, setInvoiceCreated] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  // Generate payment content and auto-create invoice when dialog opens
  useEffect(() => {
    if (open && bankSettings && tenantId) {
      const timestamp = Date.now().toString(36).toUpperCase();
      const prefix = bankSettings.payment_prefix || 'HD-';
      const newPaymentContent = `${prefix}${timestamp}`;
      setPaymentContent(newPaymentContent);
      setInvoiceCreated(false);
      setInvoiceId(null);

      // Auto create invoice if flag is set
      if (autoCreateInvoice) {
        createInvoiceWithContent(newPaymentContent);
      }
    }
  }, [open, bankSettings, tenantId, autoCreateInvoice]);

  const createInvoiceWithContent = async (content: string) => {
    if (!tenantId || !bankSettings) return;

    setIsCreatingInvoice(true);

    try {
      // Check for existing pending invoices
      const { data: pendingInvoices } = await supabase
        .from('invoices')
        .select('id, invoice_number')
        .eq('tenant_id', tenantId)
        .eq('status', 'sent')
        .limit(1);

      if (pendingInvoices && pendingInvoices.length > 0) {
        toast.error('Bạn còn hóa đơn chưa thanh toán. Vui lòng thanh toán hoặc hủy trước khi tạo mới.');
        setIsCreatingInvoice(false);
        return;
      }
      // Generate invoice number
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
      const today = new Date().toISOString().split('T')[0];
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          tenant_id: tenantId,
          invoice_number: invoiceNumber,
          invoice_date: today,
          due_date: dueDate,
          period_start: today,
          period_end: dueDate,
          subtotal: amount,
          total_amount: amount,
          status: 'sent',
          notes: description,
          items: [{
            description: description,
            quantity: 1,
            unit_price: amount,
            total: amount,
          }],
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create payment transaction
      const { error: transactionError } = await supabase
        .from('payment_transactions')
        .insert({
          tenant_id: tenantId,
          invoice_id: invoice.id,
          amount: amount,
          payment_method: 'bank_transfer',
          payment_status: 'pending',
          transaction_reference: content,
          notes: `Thanh toán qua ${bankSettings.bank_name} - ${content}`,
          metadata: {
            ...metadata,
            bank_code: bankSettings.bank_code,
            bank_name: bankSettings.bank_name,
            account_number: bankSettings.account_number,
          },
        });

      if (transactionError) throw transactionError;

      setInvoiceCreated(true);
      setInvoiceId(invoice.id);
      toast.success('Đã tạo đơn hàng. Vui lòng chuyển khoản theo thông tin bên dưới.');
      
      if (onPaymentCreated) {
        onPaymentCreated(invoice.id);
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Không thể tạo đơn hàng. Vui lòng thử lại.');
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const handleConfirmPayment = async () => {
    await createInvoiceWithContent(paymentContent);
  };

  if (isLoadingSettings) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!bankSettings) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thanh toán chuyển khoản</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-8 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
            <p className="text-muted-foreground">
              Phương thức thanh toán chuyển khoản chưa được cấu hình.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Vui lòng liên hệ quản trị viên để được hỗ trợ.
            </p>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Thanh toán chuyển khoản ngân hàng</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Loading state - khi đang tạo invoice hoặc autoCreateInvoice chưa xong */}
        {(isCreatingInvoice || (autoCreateInvoice && !invoiceCreated)) ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Đang tạo đơn hàng...</p>
          </div>
        ) : !invoiceCreated ? (
          /* Manual confirmation - chỉ hiện khi autoCreateInvoice = false */
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Số tiền thanh toán</span>
                <span className="text-2xl font-bold text-primary">
                  {amount.toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Nhấn "Xác nhận" để tạo đơn hàng và hiển thị mã QR thanh toán
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Hủy
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirmPayment}
              >
                Xác nhận thanh toán
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div className="text-sm text-green-700 dark:text-green-300">
                <p className="font-medium">Đơn hàng đã được tạo thành công!</p>
                <p>Vui lòng chuyển khoản theo thông tin bên dưới.</p>
              </div>
            </div>

            <BankQRCode
              bankCode={bankSettings.bank_code}
              bankName={bankSettings.bank_name}
              accountNumber={bankSettings.account_number}
              accountHolder={bankSettings.account_holder}
              amount={amount}
              paymentContent={paymentContent}
              qrTemplate={bankSettings.qr_template}
            />

            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={() => onOpenChange(false)}
              >
                Đóng
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Sau khi chuyển khoản, vui lòng chờ xác nhận. Theo dõi tại tab "Đang chờ"
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

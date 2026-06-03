// E-Invoice provider abstraction (multi-provider ready)
// Mọi provider mới (MISA, VNPT, EasyInvoice...) implement interface này.

export type EInvoiceProvider = 'viettel_sinvoice' | 'misa' | 'vnpt' | 'easyinvoice';
export type SignType = 'cloud' | 'usb_token';
export type Environment = 'sandbox' | 'production';

export interface EInvoiceConfig {
  id: string;
  tenant_id: string;
  hotel_id: string;
  provider: EInvoiceProvider;
  tax_code: string;
  branch_code: string | null;
  supplier_legal_name: string | null;
  supplier_address: string | null;
  api_base_url: string;
  api_username: string;
  api_password: string; // resolved từ Vault, KHÔNG log
  sign_type: SignType;
  environment: Environment;
  default_template_code: string | null;
  default_invoice_series: string | null;
  cached_token: string | null;
  cached_token_expires_at: string | null;
  extra_config: Record<string, unknown>;
}

export interface BuyerInfo {
  name: string;
  taxCode?: string;
  address?: string;
  email?: string;
  phone?: string;
  bankAccount?: string;
  bankName?: string;
}

export interface InvoiceLine {
  itemCode?: string;
  itemName: string;
  unitName?: string;
  quantity: number;
  unitPrice: number;
  vatPercentage: number; // 0,5,8,10 (-1 = không chịu thuế, -2 = KCT)
  discountPercentage?: number;
  discountAmount?: number;
}

export interface CreateInvoiceInput {
  templateCode: string;
  invoiceSeries: string;
  currencyCode?: string;          // VND
  exchangeRate?: number;          // 1
  paymentMethod?: string;         // TM, CK, TM/CK
  buyer: BuyerInfo;
  lines: InvoiceLine[];
  // Idempotency
  transactionUuid: string;
  // Adjustment / replacement
  invoiceType?: 'normal' | 'adjustment' | 'replacement';
  adjustmentType?: 1 | 3 | 5;
  originalInvoiceNo?: string;
  originalTransactionUuid?: string;
  adjustmentReason?: string;
  note?: string;
}

export interface CreateInvoiceResult {
  // Async: provider có thể trả 'processing' nếu signing ở USB token
  status: 'issued' | 'processing' | 'failed';
  invoiceNo?: string;
  reservationCode?: string;
  rawResponse: unknown;
  errorCode?: string;
  errorMessage?: string;
}

export interface SearchResult {
  found: boolean;
  status?: 'issued' | 'processing' | 'cancelled' | 'failed';
  invoiceNo?: string;
  rawResponse: unknown;
}

export interface FileResult {
  base64: string;
  mimeType: string;
}

export interface IEInvoiceProvider {
  testConnection(): Promise<{ ok: boolean; message: string; raw?: unknown }>;
  createInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceResult>;
  searchByTransactionUuid(transactionUuid: string): Promise<SearchResult>;
  downloadPdf(invoiceNo: string, templateCode: string): Promise<FileResult>;
  downloadXml(invoiceNo: string, templateCode: string): Promise<FileResult>;
  cancelInvoice(invoiceNo: string, templateCode: string, reason: string): Promise<{ ok: boolean; raw: unknown }>;
  listTemplates(): Promise<Array<{ templateCode: string; invoiceSeries: string; name?: string }>>;
}

export function redactSecrets(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  const clone: any = Array.isArray(obj) ? [...(obj as any)] : { ...(obj as any) };
  const KEYS = ['password', 'apiPassword', 'api_password', 'token', 'accessToken', 'access_token', 'Authorization', 'authorization'];
  for (const k of Object.keys(clone)) {
    if (KEYS.some((s) => k.toLowerCase() === s.toLowerCase())) {
      clone[k] = '***REDACTED***';
    } else if (typeof clone[k] === 'object') {
      clone[k] = redactSecrets(clone[k]);
    }
  }
  return clone;
}

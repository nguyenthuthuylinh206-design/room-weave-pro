// Viettel SInvoice client implementing IEInvoiceProvider
// Docs: https://api-vinvoice.viettel.vn  + Postman collection.

import {
  IEInvoiceProvider,
  EInvoiceConfig,
  CreateInvoiceInput,
  CreateInvoiceResult,
  SearchResult,
  FileResult,
} from './types.ts';

type Fetcher = typeof fetch;

interface LogRow {
  endpoint: string;
  method: string;
  status_code: number | null;
  duration_ms: number;
  request_body: unknown;
  response_body: unknown;
  error_message: string | null;
}
export type LogHook = (row: LogRow) => Promise<void> | void;

export class ViettelInvoiceProvider implements IEInvoiceProvider {
  private supplierMst: string;
  private token: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(
    private cfg: EInvoiceConfig,
    private fetcher: Fetcher = fetch,
    private logHook?: LogHook,
  ) {
    this.supplierMst = cfg.branch_code ? `${cfg.tax_code}-${cfg.branch_code}` : cfg.tax_code;
    if (cfg.cached_token && cfg.cached_token_expires_at) {
      const exp = new Date(cfg.cached_token_expires_at).getTime();
      if (exp > Date.now() + 60_000) {
        this.token = cfg.cached_token;
        this.tokenExpiresAt = exp;
      }
    }
  }

  private async log(row: LogRow) {
    try { await this.logHook?.(row); } catch (_) { /* ignore */ }
  }

  private url(path: string) {
    const base = this.cfg.api_base_url.replace(/\/$/, '');
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
    auth: boolean = true,
  ): Promise<{ ok: boolean; status: number; data: T | null; raw: unknown }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth) {
      const token = await this.getToken();
      headers['Cookie'] = `access_token=${token}`;
    }
    const url = this.url(path);
    const started = Date.now();
    let status = 0;
    let parsed: any = null;
    let errMsg: string | null = null;
    try {
      const res = await this.fetcher(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      status = res.status;
      const text = await res.text();
      try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
      return { ok: res.ok, status, data: parsed as T, raw: parsed };
    } catch (e: any) {
      errMsg = e?.message || 'fetch_failed';
      throw e;
    } finally {
      await this.log({
        endpoint: path,
        method,
        status_code: status || null,
        duration_ms: Date.now() - started,
        request_body: body ?? null,
        response_body: parsed,
        error_message: errMsg,
      });
    }
  }

  async getToken(): Promise<string> {
    if (this.token && this.tokenExpiresAt > Date.now() + 60_000) return this.token;

    const url = this.url('/auth/login');
    const started = Date.now();
    let status = 0;
    let parsed: any = null;
    try {
      const res = await this.fetcher(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: this.cfg.api_username,
          password: this.cfg.api_password,
        }),
      });
      status = res.status;
      const text = await res.text();
      try { parsed = JSON.parse(text); } catch { parsed = text; }
      if (!res.ok) {
        throw new Error(`login_failed_${status}: ${typeof parsed === 'string' ? parsed : JSON.stringify(parsed)}`);
      }
      const access = parsed?.access_token || parsed?.token || parsed?.data?.access_token;
      if (!access) throw new Error('login_no_token');
      this.token = access;
      // Viettel token ~ 1h, cache 55min an toàn
      this.tokenExpiresAt = Date.now() + 55 * 60 * 1000;
      return access;
    } finally {
      await this.log({
        endpoint: '/auth/login',
        method: 'POST',
        status_code: status || null,
        duration_ms: Date.now() - started,
        request_body: { username: this.cfg.api_username, password: '***REDACTED***' },
        response_body: parsed && typeof parsed === 'object' ? { ...parsed, access_token: '***REDACTED***', token: '***REDACTED***' } : parsed,
        error_message: null,
      });
    }
  }

  get cachedToken() {
    return { token: this.token, expiresAt: this.tokenExpiresAt };
  }

  async testConnection() {
    try {
      await this.getToken();
      return { ok: true, message: 'Đăng nhập thành công' };
    } catch (e: any) {
      return { ok: false, message: e?.message || 'Lỗi không xác định' };
    }
  }

  private buildPayload(input: CreateInvoiceInput) {
    const totalLineAmount = input.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
    const totalVat = input.lines.reduce(
      (s, l) => s + l.quantity * l.unitPrice * Math.max(l.vatPercentage, 0) / 100,
      0,
    );
    const total = totalLineAmount + totalVat;
    const itemInfo = input.lines.map((l, idx) => ({
      lineNumber: idx + 1,
      itemCode: l.itemCode || `SP${idx + 1}`,
      itemName: l.itemName,
      unitName: l.unitName || 'cái',
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      itemTotalAmountWithoutTax: l.quantity * l.unitPrice,
      taxPercentage: l.vatPercentage,
      taxAmount: l.quantity * l.unitPrice * Math.max(l.vatPercentage, 0) / 100,
      discount: l.discountPercentage ?? 0,
      itemDiscount: l.discountAmount ?? 0,
    }));

    return {
      generalInvoiceInfo: {
        invoiceType: '01GTKT',
        templateCode: input.templateCode,
        invoiceSeries: input.invoiceSeries,
        currencyCode: input.currencyCode || 'VND',
        adjustmentType: input.invoiceType === 'replacement' ? '1'
          : input.invoiceType === 'adjustment' ? '5' : '1',
        paymentStatus: true,
        paymentType: input.paymentMethod || 'TM/CK',
        paymentTypeName: input.paymentMethod || 'TM/CK',
        cusGetInvoiceRight: true,
        transactionUuid: input.transactionUuid,
        ...(input.invoiceType !== 'normal' && input.originalInvoiceNo
          ? {
              originalInvoiceId: input.originalInvoiceNo,
              additionalReferenceDesc: input.adjustmentReason || '',
            }
          : {}),
      },
      buyerInfo: {
        buyerName: input.buyer.name,
        buyerLegalName: input.buyer.name,
        buyerTaxCode: input.buyer.taxCode || '',
        buyerAddressLine: input.buyer.address || '',
        buyerPhoneNumber: input.buyer.phone || '',
        buyerEmail: input.buyer.email || '',
        buyerBankAccount: input.buyer.bankAccount || '',
        buyerBankName: input.buyer.bankName || '',
      },
      sellerInfo: {
        sellerLegalName: this.cfg.supplier_legal_name || '',
        sellerTaxCode: this.supplierMst,
        sellerAddressLine: this.cfg.supplier_address || '',
      },
      payments: [{ paymentMethodName: input.paymentMethod || 'TM/CK' }],
      summarizeInfo: {
        sumOfTotalLineAmountWithoutTax: totalLineAmount,
        totalAmountWithoutTax: totalLineAmount,
        totalTaxAmount: totalVat,
        totalAmountWithTax: total,
        discountAmount: 0,
      },
      taxBreakdowns: this.groupTax(input.lines),
      itemInfo,
      note: input.note || '',
    };
  }

  private groupTax(lines: CreateInvoiceInput['lines']) {
    const map = new Map<number, { taxableAmount: number; taxAmount: number }>();
    for (const l of lines) {
      const amt = l.quantity * l.unitPrice;
      const tax = amt * Math.max(l.vatPercentage, 0) / 100;
      const cur = map.get(l.vatPercentage) || { taxableAmount: 0, taxAmount: 0 };
      cur.taxableAmount += amt;
      cur.taxAmount += tax;
      map.set(l.vatPercentage, cur);
    }
    return Array.from(map.entries()).map(([pct, v]) => ({
      taxPercentage: pct,
      taxableAmount: v.taxableAmount,
      taxAmount: v.taxAmount,
    }));
  }

  async createInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceResult> {
    // Idempotent: kiểm tra trước
    const existing = await this.searchByTransactionUuid(input.transactionUuid);
    if (existing.found && existing.invoiceNo) {
      return {
        status: existing.status === 'issued' ? 'issued' : 'processing',
        invoiceNo: existing.invoiceNo,
        rawResponse: existing.rawResponse,
      };
    }

    const payload = this.buildPayload(input);
    try {
      const res = await this.request<any>(
        'POST',
        `/InvoiceAPI/InvoiceWS/createInvoice/${this.supplierMst}`,
        payload,
      );
      if (!res.ok) {
        return {
          status: 'failed',
          rawResponse: res.raw,
          errorCode: String(res.status),
          errorMessage: (res.data as any)?.description || (res.data as any)?.message || 'createInvoice failed',
        };
      }
      const r: any = res.data || {};
      const invoiceNo = r?.result?.invoiceNo || r?.invoiceNo;
      const reservationCode = r?.result?.reservationCode || r?.reservationCode;
      // USB token / async: chưa có invoiceNo ngay
      const status: CreateInvoiceResult['status'] = invoiceNo ? 'issued' : 'processing';
      return { status, invoiceNo, reservationCode, rawResponse: r };
    } catch (e: any) {
      return {
        status: 'failed',
        rawResponse: null,
        errorCode: 'exception',
        errorMessage: e?.message || 'network_error',
      };
    }
  }

  async searchByTransactionUuid(transactionUuid: string): Promise<SearchResult> {
    try {
      const res = await this.request<any>(
        'POST',
        `/InvoiceAPI/InvoiceWS/searchInvoiceByTransactionUuid/${this.supplierMst}`,
        { transactionUuid },
      );
      if (!res.ok || !res.data) return { found: false, rawResponse: res.raw };
      const r: any = res.data;
      const inv = r?.result || r?.data || r;
      const invoiceNo = inv?.invoiceNo;
      if (!invoiceNo) return { found: false, rawResponse: r };
      const rawStatus: string = String(inv?.status || inv?.invoiceStatus || '').toUpperCase();
      const status: SearchResult['status'] =
        rawStatus.includes('CANCEL') ? 'cancelled' :
        rawStatus.includes('RELEAS') || rawStatus.includes('SIGN') || rawStatus.includes('ISSUED') ? 'issued' :
        'processing';
      return { found: true, invoiceNo, status, rawResponse: r };
    } catch (_e) {
      return { found: false, rawResponse: null };
    }
  }

  async downloadPdf(invoiceNo: string, templateCode: string): Promise<FileResult> {
    const res = await this.request<any>(
      'POST',
      `/InvoiceAPI/InvoiceUtilsWS/getInvoiceRepresentationFile`,
      { supplierTaxCode: this.supplierMst, invoiceNo, templateCode, fileType: 'PDF' },
    );
    const b64 = res.data?.fileToBytes || res.data?.data || res.data?.result;
    if (!b64) throw new Error('pdf_not_available');
    return { base64: b64, mimeType: 'application/pdf' };
  }

  async downloadXml(invoiceNo: string, templateCode: string): Promise<FileResult> {
    const res = await this.request<any>(
      'POST',
      `/InvoiceAPI/InvoiceUtilsWS/getInvoiceRepresentationFile`,
      { supplierTaxCode: this.supplierMst, invoiceNo, templateCode, fileType: 'XML' },
    );
    const b64 = res.data?.fileToBytes || res.data?.data || res.data?.result;
    if (!b64) throw new Error('xml_not_available');
    return { base64: b64, mimeType: 'application/xml' };
  }

  async cancelInvoice(invoiceNo: string, templateCode: string, reason: string) {
    const res = await this.request<any>(
      'POST',
      `/InvoiceAPI/InvoiceWS/cancelTransactionInvoice`,
      {
        supplierTaxCode: this.supplierMst,
        templateCode,
        invoiceNo,
        strIssueDate: new Date().toISOString().slice(0, 10),
        additionalReferenceDesc: reason,
      },
    );
    return { ok: res.ok, raw: res.raw };
  }

  async listTemplates() {
    const res = await this.request<any>(
      'GET',
      `/InvoiceAPI/InvoiceUtilsWS/getAllInvoiceTemplates`,
    );
    const arr: any[] = res.data?.result || res.data?.data || res.data || [];
    return arr.map((t: any) => ({
      templateCode: t.templateCode || t.template_code,
      invoiceSeries: t.invoiceSeries || t.invoice_series,
      name: t.templateName || t.name,
    })).filter(t => t.templateCode && t.invoiceSeries);
  }
}

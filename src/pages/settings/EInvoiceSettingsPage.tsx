import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useHotelContext } from '@/contexts/HotelContext';
import {
  useEInvoiceConfig,
  useUpsertEInvoiceConfig,
  useTestEInvoiceConnection,
  useFetchProviderTemplates,
  useInvoiceTemplates,
  useUpsertTemplate,
  useDeleteTemplate,
} from '@/hooks/useEInvoice';
import { CheckCircle2, XCircle, RefreshCw, Plug, FileDown, Trash2, Star } from 'lucide-react';
import { toast } from 'sonner';

export default function EInvoiceSettingsPage() {
  const { selectedHotel } = useHotelContext();
  const { data: cfg, isLoading } = useEInvoiceConfig();
  const upsert = useUpsertEInvoiceConfig();
  const test = useTestEInvoiceConnection();
  const fetchTpl = useFetchProviderTemplates();
  const { data: templates } = useInvoiceTemplates();
  const upsertTpl = useUpsertTemplate();
  const delTpl = useDeleteTemplate();

  // form state
  const [tax_code, setTaxCode] = useState('');
  const [branch_code, setBranchCode] = useState('');
  const [supplier_legal_name, setSupplierName] = useState('');
  const [supplier_address, setSupplierAddress] = useState('');
  const [api_base_url, setBaseUrl] = useState('https://api-vinvoice.viettel.vn');
  const [api_username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [sign_type, setSignType] = useState<'cloud' | 'usb_token'>('cloud');
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [is_active, setActive] = useState(true);

  useEffect(() => {
    if (!cfg) return;
    setTaxCode(cfg.tax_code || '');
    setBranchCode(cfg.branch_code || '');
    setSupplierName(cfg.supplier_legal_name || '');
    setSupplierAddress(cfg.supplier_address || '');
    setBaseUrl(cfg.api_base_url || 'https://api-vinvoice.viettel.vn');
    setUsername(cfg.api_username || '');
    setSignType(cfg.sign_type);
    setEnvironment(cfg.environment);
    setActive(cfg.is_active);
  }, [cfg?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!selectedHotel) {
    return (
      <div className="space-y-4">
        <PageHeader title="Hóa đơn điện tử" />
        <div className="border rounded-lg p-6 text-sm text-muted-foreground text-center">
          Vui lòng chọn 1 khách sạn cụ thể từ thanh trên cùng.
        </div>
      </div>
    );
  }

  const onSave = async () => {
    if (!tax_code || !api_username) {
      toast.error('Vui lòng nhập MST và Tài khoản API');
      return;
    }
    await upsert.mutateAsync({
      id: cfg?.id,
      tax_code,
      branch_code: branch_code || null,
      supplier_legal_name: supplier_legal_name || null,
      supplier_address: supplier_address || null,
      api_base_url,
      api_username,
      sign_type,
      environment,
      is_active,
      password: password || undefined,
    } as any);
    setPassword('');
  };

  const onTest = async () => {
    if (!cfg?.id) {
      toast.error('Vui lòng lưu cấu hình trước khi kiểm tra');
      return;
    }
    await test.mutateAsync(cfg.id);
  };

  const onSyncTemplates = async () => {
    if (!cfg?.id) {
      toast.error('Vui lòng lưu cấu hình trước');
      return;
    }
    const r = await fetchTpl.mutateAsync(cfg.id);
    if (!r.ok || !r.templates?.length) {
      toast.error('Không lấy được template: ' + (r.error || 'rỗng'));
      return;
    }
    for (const t of r.templates) {
      await upsertTpl.mutateAsync({
        template_code: t.templateCode,
        invoice_series: t.invoiceSeries,
        template_name: t.name,
      });
    }
    toast.success(`Đã đồng bộ ${r.templates.length} template`);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Hóa đơn điện tử"
        description={`Cấu hình Viettel SInvoice cho: ${selectedHotel.name}`}
      />

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Đang tải…</div>
      ) : (
        <>
          {/* Connection status */}
          {cfg && (
            <div className="border rounded-lg p-3 text-xs flex items-center gap-2">
              {cfg.last_test_ok == null ? (
                <span className="text-muted-foreground">Chưa kiểm tra kết nối</span>
              ) : cfg.last_test_ok ? (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Kết nối OK
                </span>
              ) : (
                <span className="text-red-600 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Kết nối lỗi: {cfg.last_test_message}
                </span>
              )}
              {cfg.last_test_at && (
                <span className="text-muted-foreground">
                  · {new Date(cfg.last_test_at).toLocaleString('vi-VN')}
                </span>
              )}
            </div>
          )}

          {/* Form */}
          <div className="border rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Mã số thuế *">
                <Input value={tax_code} onChange={(e) => setTaxCode(e.target.value)} placeholder="0100109106" />
              </Field>
              <Field label="Mã chi nhánh (nếu có)">
                <Input value={branch_code} onChange={(e) => setBranchCode(e.target.value)} placeholder="507" />
              </Field>
              <Field label="Tên đơn vị bán">
                <Input value={supplier_legal_name} onChange={(e) => setSupplierName(e.target.value)} />
              </Field>
              <Field label="Địa chỉ">
                <Input value={supplier_address} onChange={(e) => setSupplierAddress(e.target.value)} />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="API Base URL">
                <Input value={api_base_url} onChange={(e) => setBaseUrl(e.target.value)} />
              </Field>
              <Field label="Tài khoản API *">
                <Input value={api_username} onChange={(e) => setUsername(e.target.value)} />
              </Field>
              <Field label={cfg ? 'Mật khẩu API (để trống nếu không đổi)' : 'Mật khẩu API *'}>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </Field>
              <Field label="Môi trường">
                <Select value={environment} onValueChange={(v) => setEnvironment(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox / Demo</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Hình thức ký số">
                <Select value={sign_type} onValueChange={(v) => setSignType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cloud">Ký số Cloud (HSM)</SelectItem>
                    <SelectItem value="usb_token">USB Token</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={is_active} onCheckedChange={setActive} />
                <Label className="text-sm">Kích hoạt phát hành HĐĐT</Label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
              <Button onClick={onSave} disabled={upsert.isPending}>
                {upsert.isPending ? 'Đang lưu…' : 'Lưu cấu hình'}
              </Button>
              <Button variant="outline" onClick={onTest} disabled={!cfg?.id || test.isPending}>
                <Plug className="w-4 h-4 mr-1" />
                {test.isPending ? 'Đang kiểm tra…' : 'Kiểm tra kết nối'}
              </Button>
              <Button variant="outline" onClick={onSyncTemplates} disabled={!cfg?.id || fetchTpl.isPending}>
                <RefreshCw className={`w-4 h-4 mr-1 ${fetchTpl.isPending ? 'animate-spin' : ''}`} />
                Đồng bộ template từ Viettel
              </Button>
            </div>
          </div>

          {/* Templates */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Mẫu &amp; Ký hiệu hóa đơn</h3>
              <ManualAddTemplate onAdd={(t) => upsertTpl.mutate(t)} />
            </div>
            {!templates?.length ? (
              <div className="text-xs text-muted-foreground py-4 text-center">
                Chưa có mẫu hóa đơn. Bấm “Đồng bộ template” hoặc thêm thủ công.
              </div>
            ) : (
              <div className="divide-y border rounded">
                {templates.map((t) => (
                  <div key={t.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      {t.is_default && <Star className="w-3.5 h-3.5 text-amber-500" />}
                      <span className="font-mono text-xs">{t.template_code} / {t.invoice_series}</span>
                      {t.template_name && <span className="text-muted-foreground">— {t.template_name}</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      {!t.is_default && (
                        <Button size="sm" variant="ghost" onClick={() => upsertTpl.mutate({
                          id: t.id,
                          template_code: t.template_code,
                          invoice_series: t.invoice_series,
                          template_name: t.template_name || undefined,
                          is_default: true,
                        })}>Đặt mặc định</Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => delTpl.mutate(t.id)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Lưu ý bảo mật: mật khẩu API được mã hóa và lưu trong Vault, không hiển thị lại được.
            Với USB Token, hệ thống tạo hóa đơn nháp và chờ thiết bị ký; trạng thái sẽ tự cập nhật.
          </p>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function ManualAddTemplate({ onAdd }: { onAdd: (t: any) => void }) {
  const [code, setCode] = useState('');
  const [series, setSeries] = useState('');
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);
  if (!open) {
    return <Button size="sm" variant="outline" onClick={() => setOpen(true)}>+ Thêm thủ công</Button>;
  }
  return (
    <div className="flex items-center gap-1">
      <Input className="h-8 w-28" placeholder="1/770" value={code} onChange={(e) => setCode(e.target.value)} />
      <Input className="h-8 w-24" placeholder="C25TAA" value={series} onChange={(e) => setSeries(e.target.value)} />
      <Input className="h-8 w-32" placeholder="Tên (tuỳ chọn)" value={name} onChange={(e) => setName(e.target.value)} />
      <Button size="sm" onClick={() => {
        if (!code || !series) { toast.error('Nhập đủ template + series'); return; }
        onAdd({ template_code: code, invoice_series: series, template_name: name || undefined });
        setCode(''); setSeries(''); setName(''); setOpen(false);
      }}>Lưu</Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Hủy</Button>
    </div>
  );
}

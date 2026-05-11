import { useEffect, useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ANNOUNCEMENT_KIND_LABEL,
  ANNOUNCEMENT_PLACEMENT_LABEL,
  ANNOUNCEMENT_VARIANT_LABEL,
  ANNOUNCEMENT_AUDIENCE_LABEL,
  type Announcement,
  type AnnouncementInput,
} from '@/types/announcement.types';
import {
  useCreateAnnouncement,
  useUpdateAnnouncement,
} from '@/hooks/announcements/useAnnouncementsAdmin';
import { AnnouncementLivePreview } from './AnnouncementLivePreview';

const schema = z.object({
  kind: z.enum(['promo_popup', 'version_update', 'ad_banner', 'system_notice']),
  placement: z.enum(['popup_center', 'top_banner', 'bottom_strip', 'inline_card']),
  variant: z.enum(['info', 'success', 'warning', 'promo']),
  title: z.string().min(2, 'Tiêu đề tối thiểu 2 ký tự').max(200),
  body: z.string().max(2000).optional().or(z.literal('')),
  cta_label: z.string().max(50).optional().or(z.literal('')),
  cta_url: z.string().max(500).optional().or(z.literal('')),
  image_url: z.string().max(500).optional().or(z.literal('')),
  icon: z.string().max(50).optional().or(z.literal('')),
  audience: z.enum(['all', 'tenant_owner', 'manager', 'staff', 'trial_only', 'expired_only']),
  is_active: z.boolean(),
  is_dismissible: z.boolean(),
  starts_at: z.string().optional().or(z.literal('')),
  ends_at: z.string().optional().or(z.literal('')),
  version: z.string().max(20).optional().or(z.literal('')),
  priority: z.coerce.number().int().min(0).max(1000),
});

type FormValues = z.infer<typeof schema>;

const defaults: FormValues = {
  kind: 'promo_popup',
  placement: 'popup_center',
  variant: 'promo',
  title: '',
  body: '',
  cta_label: '',
  cta_url: '',
  image_url: '',
  icon: '',
  audience: 'all',
  is_active: true,
  is_dismissible: true,
  starts_at: '',
  ends_at: '',
  version: '',
  priority: 0,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: Announcement | null;
}

export function AnnouncementFormDialog({ open, onOpenChange, editing }: Props) {
  const create = useCreateAnnouncement();
  const update = useUpdateAnnouncement();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        editing
          ? {
              kind: editing.kind,
              placement: editing.placement,
              variant: editing.variant,
              title: editing.title,
              body: editing.body ?? '',
              cta_label: editing.cta_label ?? '',
              cta_url: editing.cta_url ?? '',
              image_url: editing.image_url ?? '',
              icon: editing.icon ?? '',
              audience: editing.audience,
              is_active: editing.is_active,
              is_dismissible: editing.is_dismissible,
              starts_at: editing.starts_at ? editing.starts_at.slice(0, 16) : '',
              ends_at: editing.ends_at ? editing.ends_at.slice(0, 16) : '',
              version: editing.version ?? '',
              priority: editing.priority,
            }
          : defaults,
      );
    }
  }, [open, editing, form]);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const payload: AnnouncementInput = {
        kind: values.kind,
        placement: values.placement,
        variant: values.variant,
        title: values.title,
        body: values.body || null,
        cta_label: values.cta_label || null,
        cta_url: values.cta_url || null,
        image_url: values.image_url || null,
        icon: values.icon || null,
        audience: values.audience,
        is_active: values.is_active,
        is_dismissible: values.is_dismissible,
        starts_at: values.starts_at ? new Date(values.starts_at).toISOString() : null,
        ends_at: values.ends_at ? new Date(values.ends_at).toISOString() : null,
        version: values.version || null,
        priority: values.priority,
      };
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...payload });
      } else {
        await create.mutateAsync(payload);
      }
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const kind = form.watch('kind');
  const watched = form.watch();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Chỉnh sửa thông báo' : 'Tạo thông báo mới'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Loại thông báo</Label>
              <Select
                value={form.watch('kind')}
                onValueChange={(v) => form.setValue('kind', v as FormValues['kind'])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ANNOUNCEMENT_KIND_LABEL).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Vị trí hiển thị</Label>
              <Select
                value={form.watch('placement')}
                onValueChange={(v) => form.setValue('placement', v as FormValues['placement'])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ANNOUNCEMENT_PLACEMENT_LABEL).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Phong cách</Label>
              <Select
                value={form.watch('variant')}
                onValueChange={(v) => form.setValue('variant', v as FormValues['variant'])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ANNOUNCEMENT_VARIANT_LABEL).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Đối tượng</Label>
              <Select
                value={form.watch('audience')}
                onValueChange={(v) => form.setValue('audience', v as FormValues['audience'])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ANNOUNCEMENT_AUDIENCE_LABEL).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Tiêu đề *</Label>
            <Input {...form.register('title')} placeholder="VD: Chương trình hỗ trợ chuyển đổi số" />
            {form.formState.errors.title && (
              <p className="text-xs text-red-600 mt-1">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div>
            <Label>Nội dung</Label>
            <Textarea {...form.register('body')} rows={4} placeholder="Mô tả ngắn..." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Nhãn nút (CTA)</Label>
              <Input {...form.register('cta_label')} placeholder="Xem chi tiết" />
            </div>
            <div>
              <Label>Đường dẫn nút</Label>
              <Input {...form.register('cta_url')} placeholder="https://... hoặc /dashboard" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Ảnh banner</Label>
              <BannerImageUpload
                value={form.watch('image_url') || ''}
                onChange={(url) => form.setValue('image_url', url, { shouldValidate: true })}
              />
            </div>
            <div>
              <Label>Icon (Lucide)</Label>
              <Input {...form.register('icon')} placeholder="VD: Gift, Megaphone, Bell" />
            </div>
          </div>


          {kind === 'version_update' && (
            <div>
              <Label>Phiên bản (vd: 1.0.7)</Label>
              <Input
                {...form.register('version')}
                placeholder="1.0.7"
                readOnly={!!editing}
                className={editing ? 'bg-muted cursor-not-allowed' : ''}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {editing
                  ? 'Phiên bản gắn với bản build, không thể chỉnh sửa.'
                  : 'Mỗi user chỉ thấy popup phiên bản này 1 lần.'}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Bắt đầu</Label>
              <Input type="datetime-local" {...form.register('starts_at')} />
            </div>
            <div>
              <Label>Kết thúc</Label>
              <Input type="datetime-local" {...form.register('ends_at')} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Độ ưu tiên</Label>
              <Input type="number" min={0} max={1000} {...form.register('priority')} />
            </div>
            <div className="space-y-2 pt-5">
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active" className="cursor-pointer">Đang hoạt động</Label>
                <Switch
                  id="is_active"
                  checked={form.watch('is_active')}
                  onCheckedChange={(v) => form.setValue('is_active', v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="is_dismissible" className="cursor-pointer">Cho phép đóng</Label>
                <Switch
                  id="is_dismissible"
                  checked={form.watch('is_dismissible')}
                  onCheckedChange={(v) => form.setValue('is_dismissible', v)}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Huỷ
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Tạo thông báo'}
            </Button>
          </DialogFooter>
        </form>

          <aside className="space-y-3 lg:sticky lg:top-0 lg:self-start">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Xem trước
            </div>
            <AnnouncementLivePreview
              title={watched.title}
              body={watched.body || undefined}
              ctaLabel={watched.cta_label || undefined}
              ctaUrl={watched.cta_url || undefined}
              imageUrl={watched.image_url || undefined}
              icon={watched.icon || undefined}
              variant={watched.variant}
              placement={watched.placement}
              isDismissible={watched.is_dismissible}
            />
            <p className="text-[11px] text-muted-foreground">
              Bản xem trước cập nhật theo nội dung bạn đang nhập. Các nút trong khung không hoạt động.
            </p>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface BannerImageUploadProps {
  value: string;
  onChange: (url: string) => void;
}

function BannerImageUpload({ value, onChange }: BannerImageUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ảnh tối đa 5MB');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `banners/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from('announcement-assets')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage
        .from('announcement-assets')
        .getPublicUrl(path);
      onChange(publicUrl);
      toast.success('Đã tải ảnh lên');
    } catch (err) {
      toast.error(`Lỗi tải ảnh: ${(err as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  if (value) {
    return (
      <div className="relative inline-block">
        <img
          src={value}
          alt="Banner"
          className="h-32 w-full max-w-xs rounded-md border object-cover"
        />
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm hover:bg-destructive/90"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <label className="relative flex h-32 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/40 transition-colors">
      <input
        type="file"
        accept="image/*"
        onChange={handleFile}
        disabled={uploading}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
      {uploading ? (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground mt-2">Đang tải...</span>
        </>
      ) : (
        <>
          <Upload className="h-6 w-6 text-muted-foreground" />
          <span className="text-xs text-muted-foreground mt-2">Nhấp để chọn ảnh (≤5MB)</span>
        </>
      )}
    </label>
  );
}

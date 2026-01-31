

## Kế hoạch: Phát triển trang /super-admin/settings

### TÌNH TRẠNG HIỆN TẠI

| Thành phần | Trạng thái |
|------------|-----------|
| Route `/super-admin/settings` | Khai báo trong Navigation nhưng **CHƯA** có trong router |
| Page component | **CHƯA** có `SettingsPage.tsx` trong `pages/admin/` |
| Settings components | Đã có: `BankPaymentSettings.tsx` |
| i18n | Đã có key `settings` trong navigation/titles nhưng **CHƯA** có nội dung chi tiết |

---

### CẤU TRÚC TRANG SETTINGS

```text
/super-admin/settings
├── PageHeader (Tiêu đề + Mô tả)
├── Tabs
│   ├── Tab: Thanh toán (Payment)
│   │   └── BankPaymentSettings (đã có)
│   ├── Tab: Nền tảng (Platform)
│   │   ├── Platform branding (Logo, tên, tagline)
│   │   ├── Default settings cho tenant mới
│   │   └── Trial period settings
│   ├── Tab: Email
│   │   ├── SMTP settings
│   │   ├── Email templates preview
│   │   └── Test email
│   ├── Tab: Bảo trì (Maintenance)
│   │   ├── Maintenance mode toggle
│   │   ├── Scheduled maintenance
│   │   └── System announcements
│   └── Tab: Audit Log
│       ├── Admin activities log
│       └── Export activities
```

---

### CHI TIẾT IMPLEMENTATION

#### Phase 1: Tạo Route và Page Component

**File 1: `src/pages/admin/SuperAdminSettingsPage.tsx`**

```typescript
import { SuperAdminSettings } from '@/components/super-admin/settings/SuperAdminSettings';

export function SuperAdminSettingsPage() {
  return <SuperAdminSettings />;
}
```

**File 2: Cập nhật `src/App.tsx`**

Thêm route vào block `/super-admin`:
```typescript
{ path: "settings", element: <SuperAdminSettingsPage /> },
```

---

#### Phase 2: Tạo Component Settings chính

**File 3: `src/components/super-admin/settings/SuperAdminSettings.tsx`**

| Tab | Chức năng |
|-----|-----------|
| payment | Cấu hình ngân hàng nhận thanh toán (BankPaymentSettings - đã có) |
| platform | Cài đặt nền tảng SaaS: trial period, default rooms, branding |
| email | Cấu hình SMTP, test gửi email |
| maintenance | Chế độ bảo trì, thông báo hệ thống |
| audit | Xem lịch sử hoạt động admin |

**Logic chính:**
```typescript
export function SuperAdminSettings() {
  const { t } = useTranslation('superAdmin');
  const [activeTab, setActiveTab] = useState('payment');

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('settings.title')}
        description={t('settings.subtitle')}
      />
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="payment">Thanh toán</TabsTrigger>
          <TabsTrigger value="platform">Nền tảng</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="maintenance">Bảo trì</TabsTrigger>
          <TabsTrigger value="audit">Lịch sử</TabsTrigger>
        </TabsList>
        
        <TabsContent value="payment">
          <BankPaymentSettings />
        </TabsContent>
        {/* ... other tabs */}
      </Tabs>
    </div>
  );
}
```

---

#### Phase 3: Tạo Components cho từng Tab

**File 4: `src/components/super-admin/settings/PlatformSettings.tsx`**

Cài đặt nền tảng:
- **Trial Period**: Số ngày dùng thử mặc định cho tenant mới
- **Default Rooms**: Số phòng mặc định khi đăng ký
- **Grace Period**: Số ngày gia hạn sau khi hết hạn
- **Platform Name**: Tên hiển thị của nền tảng
- **Support Email**: Email hỗ trợ

```typescript
export function PlatformSettings() {
  // Form với các fields trên
  return (
    <div className="space-y-6">
      <div className="p-4 border rounded-lg">
        <h3 className="font-medium mb-4">Cài đặt Subscription</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Trial Period (ngày)" />
          <FormField label="Grace Period (ngày)" />
          <FormField label="Số phòng mặc định" />
          <FormField label="Giá mỗi phòng/ngày" />
        </div>
      </div>
      
      <div className="p-4 border rounded-lg">
        <h3 className="font-medium mb-4">Thông tin nền tảng</h3>
        <FormField label="Tên nền tảng" />
        <FormField label="Email hỗ trợ" />
      </div>
    </div>
  );
}
```

**File 5: `src/components/super-admin/settings/EmailSettings.tsx`**

Cài đặt email:
- **SMTP Host/Port**: Cấu hình SMTP server
- **SMTP Username/Password**: Thông tin đăng nhập
- **Sender Email/Name**: Email và tên người gửi
- **Test Email**: Gửi email test

```typescript
export function EmailSettings() {
  const [testEmail, setTestEmail] = useState('');
  
  return (
    <div className="space-y-6">
      <div className="p-4 border rounded-lg">
        <h3 className="font-medium mb-4">Cấu hình SMTP</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="SMTP Host" placeholder="smtp.gmail.com" />
          <FormField label="SMTP Port" placeholder="587" />
          <FormField label="Username" />
          <FormField label="Password" type="password" />
        </div>
      </div>
      
      <div className="p-4 border rounded-lg">
        <h3 className="font-medium mb-4">Thông tin gửi</h3>
        <FormField label="Email gửi" />
        <FormField label="Tên hiển thị" />
      </div>
      
      <div className="p-4 border rounded-lg">
        <h3 className="font-medium mb-4">Gửi email test</h3>
        <div className="flex gap-2">
          <Input placeholder="Email nhận test" value={testEmail} onChange={...} />
          <Button>Gửi test</Button>
        </div>
      </div>
    </div>
  );
}
```

**File 6: `src/components/super-admin/settings/MaintenanceSettings.tsx`**

Chế độ bảo trì:
- **Maintenance Mode**: Bật/tắt chế độ bảo trì
- **Maintenance Message**: Thông báo cho người dùng
- **Scheduled Maintenance**: Lên lịch bảo trì
- **System Announcement**: Thông báo hệ thống hiển thị cho tất cả

```typescript
export function MaintenanceSettings() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  
  return (
    <div className="space-y-6">
      <div className="p-4 border rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Chế độ bảo trì</h3>
            <p className="text-xs text-muted-foreground">
              Khi bật, người dùng sẽ thấy trang bảo trì thay vì ứng dụng
            </p>
          </div>
          <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
        </div>
        
        {maintenanceMode && (
          <Textarea 
            className="mt-4"
            placeholder="Thông báo bảo trì..." 
          />
        )}
      </div>
      
      <div className="p-4 border rounded-lg">
        <h3 className="font-medium mb-4">Thông báo hệ thống</h3>
        <Textarea placeholder="Nhập thông báo hiển thị cho tất cả người dùng..." />
        <Button className="mt-2">Gửi thông báo</Button>
      </div>
    </div>
  );
}
```

**File 7: `src/components/super-admin/settings/AuditLogSettings.tsx`**

Lịch sử hoạt động admin:
- Danh sách các hành động của Super Admin
- Lọc theo loại, thời gian
- Export CSV

```typescript
export function AuditLogSettings() {
  const { data: activities } = useAdminActivities();
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input placeholder="Tìm kiếm hoạt động..." className="max-w-xs" />
        <Button variant="outline">Xuất CSV</Button>
      </div>
      
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thời gian</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Hành động</TableHead>
              <TableHead>Đối tượng</TableHead>
              <TableHead>Chi tiết</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities?.map(activity => (...))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

---

#### Phase 4: Tạo Database Table cho Settings

**Migration: Tạo bảng `platform_settings`**

```sql
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Default settings
INSERT INTO public.platform_settings (key, value, description) VALUES
  ('trial_period_days', '14', 'Số ngày dùng thử mặc định'),
  ('grace_period_days', '7', 'Số ngày gia hạn sau khi hết hạn'),
  ('default_rooms', '10', 'Số phòng mặc định khi đăng ký'),
  ('price_per_room_day', '1000', 'Giá mỗi phòng mỗi ngày (VND)'),
  ('platform_name', '"Hotel Asset Manager"', 'Tên nền tảng'),
  ('support_email', '"support@example.com"', 'Email hỗ trợ'),
  ('maintenance_mode', 'false', 'Chế độ bảo trì'),
  ('maintenance_message', '""', 'Thông báo bảo trì');

-- RLS - Only super admin can manage
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can manage platform settings"
ON public.platform_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND user_level_code = 'super_admin'
  )
);
```

---

#### Phase 5: Tạo Hook cho Platform Settings

**File 8: `src/hooks/super-admin/usePlatformSettings.ts`**

```typescript
export function usePlatformSettings() {
  return useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*');
      
      if (error) throw error;
      
      // Convert array to object for easy access
      return data.reduce((acc, item) => {
        acc[item.key] = JSON.parse(item.value);
        return acc;
      }, {} as Record<string, any>);
    }
  });
}

export function useUpdatePlatformSetting() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase
        .from('platform_settings')
        .update({ 
          value: JSON.stringify(value),
          updated_at: new Date().toISOString()
        })
        .eq('key', key);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
    }
  });
}
```

---

#### Phase 6: Cập nhật i18n

**File 9: Cập nhật `src/i18n/locales/vi/superAdmin.json`**

```json
{
  "settings": {
    "title": "Cài đặt hệ thống",
    "subtitle": "Quản lý cấu hình nền tảng SaaS",
    "tabs": {
      "payment": "Thanh toán",
      "platform": "Nền tảng",
      "email": "Email",
      "maintenance": "Bảo trì",
      "audit": "Lịch sử"
    },
    "platform": {
      "subscriptionSettings": "Cài đặt Subscription",
      "trialPeriod": "Trial Period (ngày)",
      "gracePeriod": "Grace Period (ngày)",
      "defaultRooms": "Số phòng mặc định",
      "pricePerRoom": "Giá mỗi phòng/ngày (VND)",
      "platformInfo": "Thông tin nền tảng",
      "platformName": "Tên nền tảng",
      "supportEmail": "Email hỗ trợ"
    },
    "email": {
      "smtpConfig": "Cấu hình SMTP",
      "smtpHost": "SMTP Host",
      "smtpPort": "SMTP Port",
      "username": "Username",
      "password": "Password",
      "senderInfo": "Thông tin gửi",
      "senderEmail": "Email gửi",
      "senderName": "Tên hiển thị",
      "testEmail": "Gửi email test",
      "sendTest": "Gửi test"
    },
    "maintenance": {
      "maintenanceMode": "Chế độ bảo trì",
      "maintenanceModeDesc": "Khi bật, người dùng sẽ thấy trang bảo trì thay vì ứng dụng",
      "maintenanceMessage": "Thông báo bảo trì",
      "systemAnnouncement": "Thông báo hệ thống",
      "sendAnnouncement": "Gửi thông báo"
    },
    "audit": {
      "title": "Lịch sử hoạt động",
      "search": "Tìm kiếm hoạt động...",
      "export": "Xuất CSV",
      "time": "Thời gian",
      "admin": "Admin",
      "action": "Hành động",
      "entity": "Đối tượng",
      "details": "Chi tiết"
    },
    "save": "Lưu cài đặt",
    "saved": "Đã lưu cài đặt"
  }
}
```

---

### TÓM TẮT CÁC FILE CẦN TẠO/SỬA

| File | Hành động | Mô tả |
|------|-----------|-------|
| `src/pages/admin/SuperAdminSettingsPage.tsx` | **Tạo mới** | Page wrapper |
| `src/App.tsx` | **Sửa** | Thêm route settings |
| `src/components/super-admin/settings/SuperAdminSettings.tsx` | **Tạo mới** | Component chính với tabs |
| `src/components/super-admin/settings/PlatformSettings.tsx` | **Tạo mới** | Cài đặt nền tảng |
| `src/components/super-admin/settings/EmailSettings.tsx` | **Tạo mới** | Cài đặt email SMTP |
| `src/components/super-admin/settings/MaintenanceSettings.tsx` | **Tạo mới** | Chế độ bảo trì |
| `src/components/super-admin/settings/AuditLogSettings.tsx` | **Tạo mới** | Lịch sử hoạt động |
| `src/hooks/super-admin/usePlatformSettings.ts` | **Tạo mới** | Hook quản lý settings |
| `src/hooks/super-admin/index.ts` | **Sửa** | Export hook mới |
| `src/i18n/locales/vi/superAdmin.json` | **Sửa** | Thêm settings keys |
| `src/i18n/locales/en/superAdmin.json` | **Sửa** | Thêm settings keys (EN) |
| **Database Migration** | **Tạo mới** | Bảng `platform_settings` |

---

### KẾT QUẢ MONG ĐỢI

Trang `/super-admin/settings` hoàn chỉnh với:

| Tab | Chức năng |
|-----|-----------|
| **Thanh toán** | Cấu hình ngân hàng nhận thanh toán VietQR |
| **Nền tảng** | Trial period, grace period, default rooms, giá |
| **Email** | SMTP settings, test email |
| **Bảo trì** | Maintenance mode, system announcements |
| **Lịch sử** | Audit log cho các hành động admin |

---

### PHONG CÁCH UI (Enterprise SaaS Minimalist)

- Sử dụng `PageHeader` từ shared components
- Tabs gọn gàng với icons
- Form sections với `border rounded-lg` thay vì Card
- Padding compact: `p-4`
- Font: `text-xs` labels, `text-sm` content
- Màu chữ semantic cho status


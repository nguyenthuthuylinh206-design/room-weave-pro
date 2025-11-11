import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/PageHeader";
import { 
  Plug, 
  Mail, 
  Calendar, 
  MessageSquare, 
  CreditCard,
  Cloud,
  Link as LinkIcon,
  CheckCircle2,
  Circle
} from "lucide-react";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  status: "connected" | "available" | "coming-soon";
  category: "communication" | "payment" | "cloud" | "automation";
}

const integrations: Integration[] = [
  {
    id: "email",
    name: "Email Service",
    description: "Gửi email tự động cho khách hàng và nhân viên",
    icon: Mail,
    status: "available",
    category: "communication",
  },
  {
    id: "calendar",
    name: "Google Calendar",
    description: "Đồng bộ lịch làm việc và bảo trì",
    icon: Calendar,
    status: "available",
    category: "automation",
  },
  {
    id: "sms",
    name: "SMS Gateway",
    description: "Gửi thông báo SMS cho khách hàng",
    icon: MessageSquare,
    status: "coming-soon",
    category: "communication",
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Thanh toán trực tuyến và quản lý đơn hàng",
    icon: CreditCard,
    status: "available",
    category: "payment",
  },
  {
    id: "cloud-storage",
    name: "Cloud Storage",
    description: "Lưu trữ hình ảnh và tài liệu",
    icon: Cloud,
    status: "connected",
    category: "cloud",
  },
  {
    id: "webhook",
    name: "Webhooks",
    description: "Tích hợp với hệ thống bên ngoài",
    icon: LinkIcon,
    status: "available",
    category: "automation",
  },
];

const statusConfig = {
  connected: {
    label: "Đã kết nối",
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  available: {
    label: "Khả dụng",
    icon: Circle,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  "coming-soon": {
    label: "Sắp ra mắt",
    icon: Circle,
    color: "text-gray-400",
    bgColor: "bg-gray-100",
  },
};

export default function IntegrationsPage() {
  const groupedIntegrations = integrations.reduce((acc, integration) => {
    if (!acc[integration.category]) {
      acc[integration.category] = [];
    }
    acc[integration.category].push(integration);
    return acc;
  }, {} as Record<string, Integration[]>);

  const categoryLabels = {
    communication: "Giao tiếp",
    payment: "Thanh toán",
    cloud: "Lưu trữ",
    automation: "Tự động hóa",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tích hợp & API"
        description="Kết nối với các dịch vụ bên ngoài để mở rộng chức năng"
      />

      {Object.entries(groupedIntegrations).map(([category, items]) => (
        <div key={category} className="space-y-4">
          <h2 className="text-lg font-semibold">
            {categoryLabels[category as keyof typeof categoryLabels]}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((integration) => {
              const StatusIcon = statusConfig[integration.status].icon;
              const Icon = integration.icon;

              return (
                <Card key={integration.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {integration.name}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {integration.description}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`${statusConfig[integration.status].bgColor} ${statusConfig[integration.status].color} border-0`}
                      >
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {statusConfig[integration.status].label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      {integration.status === "connected" ? (
                        <div className="flex items-center gap-2">
                          <Switch defaultChecked />
                          <Label className="text-sm">Đang hoạt động</Label>
                        </div>
                      ) : integration.status === "available" ? (
                        <Button size="sm" variant="outline">
                          <Plug className="mr-2 h-4 w-4" />
                          Kết nối
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" disabled>
                          Sắp ra mắt
                        </Button>
                      )}
                      {integration.status !== "coming-soon" && (
                        <Button size="sm" variant="ghost">
                          Cấu hình
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Cần tích hợp khác?</CardTitle>
          <CardDescription>
            Liên hệ với chúng tôi để yêu cầu tích hợp mới
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline">
            <Mail className="mr-2 h-4 w-4" />
            Gửi yêu cầu
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

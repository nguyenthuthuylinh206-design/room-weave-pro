import { Download, Smartphone, Zap, Wifi, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export const InstallPage = () => {
  const { isInstalled, canInstall, installPWA } = usePWAInstall();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleInstall = async () => {
    const success = await installPWA();
    
    if (success) {
      toast({
        title: "Cài đặt thành công!",
        description: "Ứng dụng đã được thêm vào màn hình chính.",
      });
      setTimeout(() => navigate('/'), 2000);
    }
  };

  const benefits = [
    {
      icon: Smartphone,
      title: "Truy cập nhanh",
      description: "Mở ứng dụng ngay từ màn hình chính, không cần mở trình duyệt"
    },
    {
      icon: Wifi,
      title: "Hoạt động offline",
      description: "Xem dữ liệu đã lưu và làm việc ngay cả khi mất kết nối"
    },
    {
      icon: Zap,
      title: "Hiệu suất cao",
      description: "Tải nhanh hơn và mượt mà như ứng dụng gốc"
    },
    {
      icon: CheckCircle2,
      title: "Cập nhật tự động",
      description: "Luôn có phiên bản mới nhất mà không cần cài đặt lại"
    }
  ];

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Đã cài đặt!</h1>
          <p className="text-muted-foreground mb-6">
            RoomQc đã được cài đặt trên thiết bị của bạn
          </p>
          <Button onClick={() => navigate('/')} className="w-full">
            Về Trang chủ
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Download className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Cài đặt RoomQc</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Trải nghiệm quản lý khách sạn tốt nhất với ứng dụng có thể cài đặt
          </p>
        </div>

        {/* Install Button */}
        {canInstall && (
          <div className="mb-12 flex justify-center">
            <Button 
              size="lg" 
              onClick={handleInstall}
              className="px-8"
            >
              <Download className="w-5 h-5 mr-2" />
              Cài đặt ngay
            </Button>
          </div>
        )}

        {/* Benefits */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {benefits.map((benefit, index) => (
            <Card key={index} className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <benefit.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Installation Instructions */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Hướng dẫn cài đặt</h2>
          
          <div className="space-y-6">
            {/* Chrome/Edge on Android */}
            <div>
              <h3 className="font-medium mb-2">📱 Chrome/Edge trên Android</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Nhấn vào nút "Cài đặt ngay" ở trên</li>
                <li>Hoặc mở menu trình duyệt (⋮) và chọn "Thêm vào màn hình chính"</li>
                <li>Xác nhận và ứng dụng sẽ được thêm vào màn hình chính</li>
              </ol>
            </div>

            {/* Safari on iOS */}
            <div>
              <h3 className="font-medium mb-2">🍎 Safari trên iOS</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Nhấn vào nút Chia sẻ (□↑) ở thanh công cụ</li>
                <li>Cuộn xuống và chọn "Thêm vào màn hình chính"</li>
                <li>Đặt tên và nhấn "Thêm"</li>
              </ol>
            </div>

            {/* Desktop */}
            <div>
              <h3 className="font-medium mb-2">💻 Trình duyệt Desktop</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Nhấn vào nút "Cài đặt ngay" ở trên</li>
                <li>Hoặc tìm biểu tượng cài đặt (+) trên thanh địa chỉ</li>
                <li>Xác nhận và ứng dụng sẽ mở trong cửa sổ riêng</li>
              </ol>
            </div>
          </div>
        </Card>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Button variant="outline" onClick={() => navigate('/')}>
            Quay lại Trang chủ
          </Button>
        </div>
      </div>
    </div>
  );
};

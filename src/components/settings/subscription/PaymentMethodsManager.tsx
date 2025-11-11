import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Plus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

export function PaymentMethodsManager() {
  // TODO: Implement actual payment methods fetch when Stripe is integrated
  const paymentMethods: any[] = [];

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Sắp ra mắt</AlertTitle>
        <AlertDescription>
          Chức năng quản lý phương thức thanh toán sẽ được tích hợp sau khi hoàn thành tích hợp với Stripe/VNPay.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Phương thức thanh toán</CardTitle>
              <CardDescription>
                Quản lý các phương thức thanh toán của bạn
              </CardDescription>
            </div>
            <Button disabled>
              <Plus className="h-4 w-4 mr-2" />
              Thêm phương thức
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {paymentMethods.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Chưa có phương thức thanh toán nào
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <CreditCard className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <div className="font-semibold">
                        {method.card_brand} •••• {method.card_last4}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Hết hạn {method.card_exp_month}/{method.card_exp_year}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {method.is_default && (
                      <Badge variant="secondary">Mặc định</Badge>
                    )}
                    <Button variant="ghost" size="sm">
                      Xóa
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from 'react';
import { PromotionalCode } from '@/types/super-admin.types';
import { usePromoCodes, useDeletePromoCode } from '@/hooks/super-admin/usePromoCodes';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function PromoCodesTable() {
  const { data: promoCodes, isLoading } = usePromoCodes();
  const deleteMutation = useDeletePromoCode();

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Đã sao chép mã: ' + code);
  };

  const getDiscountDisplay = (code: PromotionalCode) => {
    if (code.discount_type === 'percentage') {
      return `${code.discount_value}%`;
    } else if (code.discount_type === 'fixed_amount') {
      return `${code.discount_value.toLocaleString('vi-VN')}₫`;
    } else if (code.discount_type === 'free_trial_extension') {
      return `+${code.discount_value} ngày trial`;
    } else {
      return `${code.discount_value} tháng miễn phí`;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Mã khuyến mãi</CardTitle>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Tạo mã mới
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã</TableHead>
              <TableHead>Giảm giá</TableHead>
              <TableHead>Áp dụng</TableHead>
              <TableHead>Sử dụng</TableHead>
              <TableHead>Hiệu lực</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {promoCodes?.map((code) => (
              <TableRow key={code.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <code className="font-mono font-bold">{code.code}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyCode(code.code)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  {code.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {code.description}
                    </p>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  {getDiscountDisplay(code)}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {code.applicable_plans.includes('all')
                      ? 'Tất cả gói'
                      : code.applicable_plans.join(', ')}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {code.current_uses}/{code.max_uses || '∞'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-xs">
                    {code.valid_until ? (
                      <>
                        Đến{' '}
                        {format(new Date(code.valid_until), 'dd/MM/yyyy')}
                      </>
                    ) : (
                      'Vô thời hạn'
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={code.is_active ? 'default' : 'secondary'}
                  >
                    {code.is_active ? 'Hoạt động' : 'Tạm dừng'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(code.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

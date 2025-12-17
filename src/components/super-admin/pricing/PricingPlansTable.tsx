import { useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MoreHorizontal, ArrowUpDown, Plus, Calculator, Building2, Calendar, DollarSign } from 'lucide-react';
import { usePlansWithTenantCounts, useArchivePlan, useReactivatePlan } from '@/hooks/super-admin/usePricingManagement';
import { PricingEditor } from './PricingEditor';
import { PlanEditor } from './PlanEditor';
import { CreatePlanDialog } from './CreatePlanDialog';
import { RoomPriceCalculator } from './RoomPriceCalculator';
import type { SubscriptionPlan } from '@/types/subscription.types';

export function PricingPlansTable() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [pricingEditorOpen, setPricingEditorOpen] = useState(false);
  const [planEditorOpen, setPlanEditorOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: plans = [], isLoading } = usePlansWithTenantCounts();
  const archivePlan = useArchivePlan();
  const reactivatePlan = useReactivatePlan();

  // Get room-based pricing info from first active plan
  const activePlan = plans.find((p: any) => p.is_active);
  const pricePerRoomDaily = (activePlan as any)?.price_per_room_daily || 1000;
  const minDays = (activePlan as any)?.min_subscription_days || 30;

  const columns: ColumnDef<SubscriptionPlan & { tenant_count?: number }>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Tên gói
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-sm text-muted-foreground">{row.original.code}</div>
        </div>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Trạng thái',
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
          {row.original.is_active ? 'Hoạt động' : 'Không hoạt động'}
        </Badge>
      ),
    },
    {
      id: 'room_pricing',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Giá/phòng/ngày
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const plan = row.original as any;
        return (
          <div>
            <div className="font-medium text-primary">
              {(plan.price_per_room_daily || 1000).toLocaleString('vi-VN')}đ
            </div>
            <div className="text-xs text-muted-foreground">
              /phòng/ngày
            </div>
          </div>
        );
      },
    },
    {
      id: 'min_days',
      header: 'Tối thiểu',
      cell: ({ row }) => {
        const plan = row.original as any;
        return (
          <div>
            <div className="font-medium">{plan.min_subscription_days || 30} ngày</div>
            <div className="text-xs text-muted-foreground">
              = {((plan.min_subscription_days || 30) / 30).toFixed(0)} tháng
            </div>
          </div>
        );
      },
    },
    {
      id: 'sample_price',
      header: 'Giá mẫu (50 phòng)',
      cell: ({ row }) => {
        const plan = row.original as any;
        const pricePerDay = plan.price_per_room_daily || 1000;
        const minDays = plan.min_subscription_days || 30;
        const samplePrice = 50 * pricePerDay * minDays;
        return (
          <div>
            <div className="font-medium text-green-600">
              {samplePrice.toLocaleString('vi-VN')}đ
            </div>
            <div className="text-xs text-muted-foreground">
              50 × {pricePerDay.toLocaleString()}đ × {minDays} ngày
            </div>
          </div>
        );
      },
    },
    {
      id: 'limits',
      header: 'Giới hạn',
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{row.original.max_hotels === -1 ? 'Không giới hạn' : `${row.original.max_hotels} khách sạn`}</div>
          <div className="text-muted-foreground">{row.original.max_users === -1 ? 'Không giới hạn' : `${row.original.max_users} người dùng`}</div>
        </div>
      ),
    },
    {
      accessorKey: 'tenant_count',
      header: 'Khách hàng',
      cell: ({ row }) => (
        <Badge variant="outline">{(row.original as any).activeTenantCount || 0}</Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const plan = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Hành động</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedPlan(plan);
                  setPlanEditorOpen(true);
                }}
              >
                Chỉnh sửa chi tiết gói
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedPlan(plan);
                  setPricingEditorOpen(true);
                }}
              >
                Chỉnh sửa giá
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-orange-600"
                onClick={async () => {
                  if (plan.is_active) {
                    await archivePlan.mutateAsync(plan.id);
                  } else {
                    await reactivatePlan.mutateAsync(plan.id);
                  }
                }}
              >
                {plan.is_active ? 'Lưu trữ gói' : 'Kích hoạt lại gói'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: plans,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  return (
    <div className="space-y-6">
      {/* Pricing Model Info */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Mô hình giá theo phòng
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold text-primary">
                  {pricePerRoomDaily.toLocaleString('vi-VN')}đ
                </div>
                <div className="text-sm text-muted-foreground">/phòng/ngày</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{minDays} ngày</div>
                <div className="text-sm text-muted-foreground">Đăng ký tối thiểu</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
              <Calculator className="h-8 w-8 text-primary" />
              <div>
                <div className="text-sm font-medium">Công thức tính giá</div>
                <div className="text-xs text-muted-foreground">
                  Số phòng × {pricePerRoomDaily.toLocaleString()}đ × Số ngày
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Calculator */}
      <RoomPriceCalculator 
        pricePerRoomDaily={pricePerRoomDaily} 
        minDays={minDays} 
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gói đăng ký</h2>
          <p className="text-muted-foreground">Quản lý giá và tính năng của các gói</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Tạo gói mới
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Không tìm thấy gói nào.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Tổng {table.getFilteredRowModel().rows.length} gói
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Trước
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Sau
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      <PricingEditor
        plan={selectedPlan}
        open={pricingEditorOpen}
        onOpenChange={setPricingEditorOpen}
      />
      
      <PlanEditor
        plan={selectedPlan}
        open={planEditorOpen}
        onOpenChange={setPlanEditorOpen}
      />
      
      <CreatePlanDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
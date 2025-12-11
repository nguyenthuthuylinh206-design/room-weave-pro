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
import { MoreHorizontal, ArrowUpDown, Plus } from 'lucide-react';
import { usePlansWithTenantCounts, useArchivePlan, useReactivatePlan } from '@/hooks/super-admin/usePricingManagement';
import { PricingEditor } from './PricingEditor';
import { PlanEditor } from './PlanEditor';
import { CreatePlanDialog } from './CreatePlanDialog';
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
      accessorKey: 'price_monthly',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Giá/tháng
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <span className="font-medium">{row.original.price_monthly?.toLocaleString('vi-VN')}đ</span>
      ),
    },
    {
      accessorKey: 'price_yearly',
      header: 'Giá/năm',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.price_yearly?.toLocaleString('vi-VN')}đ</div>
          {row.original.price_monthly && (
            <div className="text-xs text-muted-foreground">
              Tiết kiệm {Math.round((1 - row.original.price_yearly / (row.original.price_monthly * 12)) * 100)}%
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'limits',
      header: 'Giới hạn',
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{row.original.max_hotels} khách sạn</div>
          <div className="text-muted-foreground">{row.original.max_users} người dùng</div>
        </div>
      ),
    },
    {
      accessorKey: 'tenant_count',
      header: 'Khách hàng',
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.tenant_count || 0}</Badge>
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
    <div className="space-y-4">
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

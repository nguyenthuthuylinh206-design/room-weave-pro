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
  type ColumnFiltersState,
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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Search, ArrowUpDown } from 'lucide-react';
import { useTenants } from '@/hooks/super-admin/useTenants';
import { TenantDetailsDialog } from './TenantDetailsDialog';
import type { Tenant } from '@/hooks/super-admin/useTenants';

export function TenantsTable() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: tenants = [], isLoading } = useTenants();

  const columns: ColumnDef<Tenant>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Tenant Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-foreground">{row.original.name}</div>
          <div className="text-sm text-muted-foreground">{row.original.primary_contact_email}</div>
        </div>
      ),
    },
    {
      accessorKey: 'subscription_status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.subscription_status;
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
          active: 'default',
          trial: 'secondary',
          cancelled: 'destructive',
          suspended: 'destructive',
          grace_period: 'outline',
        };
        return (
          <Badge variant={variants[status] || 'outline'}>
            {status.replace('_', ' ').toUpperCase()}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'subscription_plan_id',
      header: 'Plan',
      cell: ({ row }) => {
        return <span className="font-medium text-foreground">Premium</span>;
      },
    },
    {
      accessorKey: 'subscription_end_date',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Expires
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const date = row.original.subscription_end_date;
        if (!date) return <span className="text-muted-foreground">-</span>;
        
        const expiryDate = new Date(date);
        const daysUntilExpiry = Math.ceil(
          (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        
        return (
          <div>
            <div className="text-foreground">{expiryDate.toLocaleDateString()}</div>
            {daysUntilExpiry <= 7 && daysUntilExpiry > 0 && (
              <div className="text-xs text-orange-600">
                {daysUntilExpiry} days left
              </div>
            )}
            {daysUntilExpiry < 0 && (
              <div className="text-xs text-destructive">Expired</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => <span className="text-foreground">{new Date(row.original.created_at).toLocaleDateString()}</span>,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const tenant = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedTenant(tenant);
                  setDetailsOpen(true);
                }}
              >
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem>Extend Subscription</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-orange-600">
                Suspend Tenant
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                Delete Tenant
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: tenants,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tenants..."
            value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
            onChange={(e) =>
              table.getColumn('name')?.setFilterValue(e.target.value)
            }
            className="pl-9"
          />
        </div>
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
                  Loading...
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
                  No tenants found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} tenant(s) total
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Details Dialog */}
      <TenantDetailsDialog
        tenant={selectedTenant}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
}

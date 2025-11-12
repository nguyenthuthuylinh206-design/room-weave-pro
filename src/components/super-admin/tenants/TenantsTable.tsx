import { useState, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, ArrowUpDown } from 'lucide-react';
import { useTenants } from '@/hooks/super-admin/useTenants';
import { TenantDetailsDialog } from './TenantDetailsDialog';

interface TenantsTableProps {
  statusFilter?: string;
  planFilter?: string;
  searchQuery?: string;
  selectedTenants?: string[];
  onSelectionChange?: (selected: string[]) => void;
}

export function TenantsTable({
  statusFilter = 'all',
  planFilter = 'all',
  searchQuery = '',
  selectedTenants = [],
  onSelectionChange,
}: TenantsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [selectedTenant, setSelectedTenant] = useState<any | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: tenants = [], isLoading } = useTenants();

  // Filter tenants based on props
  const filteredTenants = useMemo(() => {
    return tenants.filter((tenant: any) => {
      const matchesStatus = statusFilter === 'all' || tenant.subscription_status === statusFilter;
      const matchesSearch = !searchQuery || 
        tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.primary_contact_email.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesStatus && matchesSearch;
    });
  }, [tenants, statusFilter, searchQuery]);

  const handleSelectAll = (checked: boolean) => {
    if (onSelectionChange) {
      onSelectionChange(checked ? filteredTenants.map((t: any) => t.id) : []);
    }
  };

  const handleSelectRow = (tenantId: string, checked: boolean) => {
    if (onSelectionChange) {
      if (checked) {
        onSelectionChange([...selectedTenants, tenantId]);
      } else {
        onSelectionChange(selectedTenants.filter(id => id !== tenantId));
      }
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={selectedTenants.length === filteredTenants.length && filteredTenants.length > 0}
          onCheckedChange={handleSelectAll}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedTenants.includes(row.original.id)}
          onCheckedChange={(checked) => handleSelectRow(row.original.id, checked as boolean)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
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
    data: filteredTenants,
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

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
import { MoreHorizontal, ArrowUpDown, Building2, Users, AlertCircle, Receipt } from 'lucide-react';
import { useTenants, useSuspendTenant, useReactivateTenant, useDeleteTenant } from '@/hooks/super-admin/useTenants';
import { TenantDetailsDialog } from './TenantDetailsDialog';
import { ChangePlanDialog } from './ChangePlanDialog';
import { DeleteTenantDialog } from './DeleteTenantDialog';
import { TenantBillingDialog } from './TenantBillingDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const { t } = useTranslation('superAdmin');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [selectedTenant, setSelectedTenant] = useState<any | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [billingDialogOpen, setBillingDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [tenantToSuspend, setTenantToSuspend] = useState<any | null>(null);

  const suspendMutation = useSuspendTenant();
  const reactivateMutation = useReactivateTenant();
  const deleteMutation = useDeleteTenant();

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

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      active: t('tenants.status.active'),
      trial: t('tenants.status.trial'),
      cancelled: t('tenants.status.cancelled'),
      suspended: t('tenants.status.suspended'),
      grace_period: t('tenants.status.gracePeriod'),
    };
    return statusMap[status] || status;
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
            {t('tenants.table.tenantName')}
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
      header: t('tenants.table.status'),
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
            {getStatusLabel(status)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'subscription_plan_id',
      header: t('tenants.table.plan'),
      cell: ({ row }) => {
        const plan = row.original.subscription_plan;
        return (
          <div>
            <div className="font-medium text-foreground">{plan?.name || t('tenants.table.noPlan')}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.billing_cycle === 'monthly' ? t('tenants.table.monthly') : t('tenants.table.yearly')}
            </div>
          </div>
        );
      },
    },
    {
      id: 'usage',
      header: t('tenants.table.usage'),
      cell: ({ row }) => {
        const tenant = row.original;
        const usage = tenant.tenant_usage?.[0];
        const plan = tenant.subscription_plan;
        
        if (!usage) return <span className="text-muted-foreground">-</span>;
        
        const hotelsPercent = plan?.max_hotels 
          ? Math.round((usage.current_hotels_count / plan.max_hotels) * 100)
          : 0;
        const usersPercent = plan?.max_users
          ? Math.round((usage.current_users_count / plan.max_users) * 100)
          : 0;
          
        const isOverLimit = hotelsPercent > 100 || usersPercent > 100;
        
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <Building2 className="h-3 w-3" />
              <span className={isOverLimit ? 'text-destructive' : 'text-foreground'}>
                {usage.current_hotels_count}/{plan?.max_hotels || '∞'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Users className="h-3 w-3" />
              <span className={isOverLimit ? 'text-destructive' : 'text-foreground'}>
                {usage.current_users_count}/{plan?.max_users || '∞'}
              </span>
            </div>
            {isOverLimit && (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                {t('tenants.table.overLimit')}
              </div>
            )}
          </div>
        );
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
            {t('tenants.table.expires')}
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
                {t('tenants.table.daysLeft', { count: daysUntilExpiry })}
              </div>
            )}
            {daysUntilExpiry < 0 && (
              <div className="text-xs text-destructive">{t('tenants.table.expired')}</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: t('tenants.table.created'),
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
              <DropdownMenuLabel>{t('tenants.actions.label')}</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedTenant(tenant);
                  setDetailsOpen(true);
                }}
              >
                {t('tenants.actions.viewDetails')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedTenant(tenant);
                  setBillingDialogOpen(true);
                }}
              >
                <Receipt className="h-4 w-4 mr-2" />
                {t('tenants.actions.viewBilling')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedTenant(tenant);
                  setChangePlanOpen(true);
                }}
              >
                {t('tenants.actions.changePlan')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {tenant.subscription_status === 'suspended' ? (
                <DropdownMenuItem
                  className="text-green-600"
                  onClick={() => reactivateMutation.mutate(tenant.id)}
                >
                  {t('tenants.actions.reactivate')}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className="text-orange-600"
                  onClick={() => {
                    setTenantToSuspend(tenant);
                    setSuspendDialogOpen(true);
                  }}
                >
                  {t('tenants.actions.suspend')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  setSelectedTenant(tenant);
                  setDeleteDialogOpen(true);
                }}
              >
                {t('tenants.actions.delete')}
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
                  {t('tenants.table.loading')}
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
                  {t('tenants.table.noTenants')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {t('tenants.table.tenantsTotal', { count: table.getFilteredRowModel().rows.length })}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {t('tenants.table.previous')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {t('tenants.table.next')}
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      <TenantDetailsDialog
        tenant={selectedTenant}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
      
      <TenantBillingDialog
        tenant={selectedTenant}
        open={billingDialogOpen}
        onOpenChange={setBillingDialogOpen}
      />
      
      <ChangePlanDialog
        tenant={selectedTenant}
        open={changePlanOpen}
        onOpenChange={setChangePlanOpen}
      />
      
      <DeleteTenantDialog
        tenant={selectedTenant}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
      
      {/* Suspend Confirmation Dialog */}
      <AlertDialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('tenants.dialogs.suspendTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('tenants.dialogs.suspendDescription', { name: tenantToSuspend?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('tenants.dialogs.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (tenantToSuspend) {
                  suspendMutation.mutate(tenantToSuspend.id);
                  setSuspendDialogOpen(false);
                  setTenantToSuspend(null);
                }
              }}
            >
              {t('tenants.dialogs.suspendConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

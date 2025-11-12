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
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoreHorizontal, ArrowUpDown, RefreshCw, Send } from 'lucide-react';
import {
  useRenewalReminders,
  useScheduleReminders,
  useSendReminder,
} from '@/hooks/super-admin/useRenewalReminders';
import type { RenewalReminder } from '@/types/super-admin.types';

export function RemindersTable() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: reminders = [], isLoading } = useRenewalReminders(
    statusFilter !== 'all' ? { status: statusFilter as any } : undefined
  );
  const scheduleReminders = useScheduleReminders();
  const sendReminder = useSendReminder();

  const columns: ColumnDef<RenewalReminder>[] = [
    {
      accessorKey: 'tenant',
      header: 'Tenant',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.tenant?.name || 'N/A'}</div>
          <div className="text-sm text-muted-foreground">
            {row.original.owner?.email || 'N/A'}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'reminder_type',
      header: 'Type',
      cell: ({ row }) => {
        const typeLabels: Record<string, string> = {
          '7_days': '7 Days Before',
          '3_days': '3 Days Before',
          '1_day': '1 Day Before',
          expired: 'Expired',
          grace_period_ending: 'Grace Period',
        };
        return (
          <Badge variant="outline">
            {typeLabels[row.original.reminder_type] || row.original.reminder_type}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
          pending: 'secondary',
          sent: 'default',
          failed: 'destructive',
          cancelled: 'outline',
        };
        return (
          <Badge variant={variants[row.original.status] || 'outline'}>
            {row.original.status.toUpperCase()}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'scheduled_for',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Scheduled For
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div>
          <div>{new Date(row.original.scheduled_for).toLocaleDateString()}</div>
          <div className="text-xs text-muted-foreground">
            {new Date(row.original.scheduled_for).toLocaleTimeString()}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'sent_at',
      header: 'Sent At',
      cell: ({ row }) =>
        row.original.sent_at ? (
          <div>
            <div>{new Date(row.original.sent_at).toLocaleDateString()}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(row.original.sent_at).toLocaleTimeString()}
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const reminder = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              {reminder.status === 'pending' && (
                <DropdownMenuItem
                  onClick={() => sendReminder.mutate(reminder.id)}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Now
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>View Details</DropdownMenuItem>
              {reminder.status === 'failed' && (
                <DropdownMenuItem>Retry</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: reminders,
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Renewal Reminders</h2>
          <p className="text-muted-foreground">
            Automated email notifications for subscription renewals
          </p>
        </div>
        <Button
          onClick={() => scheduleReminders.mutate()}
          disabled={scheduleReminders.isPending}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Schedule Reminders
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
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
                  No reminders found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} reminder(s) total
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
    </div>
  );
}

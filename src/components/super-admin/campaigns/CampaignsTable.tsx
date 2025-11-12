import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoreHorizontal, ArrowUpDown, Plus, Play, Pause } from 'lucide-react';
import {
  useMarketingCampaigns,
  useLaunchCampaign,
  usePauseCampaign,
} from '@/hooks/super-admin/useMarketingCampaigns';
import type { MarketingCampaign } from '@/types/super-admin.types';

export function CampaignsTable() {
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: campaigns = [], isLoading } = useMarketingCampaigns(
    statusFilter !== 'all' ? { status: statusFilter as any } : undefined
  );
  const launchCampaign = useLaunchCampaign();
  const pauseCampaign = usePauseCampaign();

  const columns: ColumnDef<MarketingCampaign>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Campaign Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-sm text-muted-foreground">
            {row.original.campaign_type.replace('_', ' ')}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
          draft: 'outline',
          scheduled: 'secondary',
          active: 'default',
          paused: 'destructive',
          completed: 'secondary',
        };
        return (
          <Badge variant={variants[row.original.status] || 'outline'}>
            {row.original.status.toUpperCase()}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'target_audience',
      header: 'Audience',
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.target_audience.replace('_', ' ')}
        </span>
      ),
    },
    {
      id: 'performance',
      header: 'Performance',
      cell: ({ row }) => {
        const openRate = row.original.emails_sent > 0
          ? ((row.original.emails_opened / row.original.emails_sent) * 100).toFixed(1)
          : '0';
        const clickRate = row.original.emails_sent > 0
          ? ((row.original.clicks / row.original.emails_sent) * 100).toFixed(1)
          : '0';
        const conversionRate = row.original.emails_sent > 0
          ? ((row.original.conversions / row.original.emails_sent) * 100).toFixed(1)
          : '0';

        return (
          <div className="text-sm">
            <div>{row.original.emails_sent} sent</div>
            <div className="text-muted-foreground">
              {openRate}% open • {clickRate}% click • {conversionRate}% conv
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'starts_at',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Start Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => new Date(row.original.starts_at).toLocaleDateString(),
    },
    {
      accessorKey: 'ends_at',
      header: 'End Date',
      cell: ({ row }) =>
        row.original.ends_at ? (
          new Date(row.original.ends_at).toLocaleDateString()
        ) : (
          <span className="text-muted-foreground">No end date</span>
        ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const campaign = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem>Edit Campaign</DropdownMenuItem>
              <DropdownMenuSeparator />
              {campaign.status === 'draft' && (
                <DropdownMenuItem
                  onClick={() => launchCampaign.mutate(campaign.id)}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Launch Campaign
                </DropdownMenuItem>
              )}
              {campaign.status === 'active' && (
                <DropdownMenuItem
                  onClick={() => pauseCampaign.mutate(campaign.id)}
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Pause Campaign
                </DropdownMenuItem>
              )}
              {campaign.status === 'paused' && (
                <DropdownMenuItem
                  onClick={() => launchCampaign.mutate(campaign.id)}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Resume Campaign
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                Delete Campaign
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: campaigns,
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
          <h2 className="text-2xl font-bold">Marketing Campaigns</h2>
          <p className="text-muted-foreground">
            Create and manage email marketing campaigns
          </p>
        </div>
        <Button onClick={() => navigate('/super-admin/campaigns/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
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
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
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
                  No campaigns found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} campaign(s) total
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

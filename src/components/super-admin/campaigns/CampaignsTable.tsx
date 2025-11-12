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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Plus, 
  Play, 
  Pause, 
  BarChart3,
  Trash2,
} from 'lucide-react';
import {
  useMarketingCampaigns,
  useLaunchCampaign,
  usePauseCampaign,
} from '@/hooks/super-admin/useMarketingCampaigns';
import { CampaignStats } from './CampaignStats';
import type { MarketingCampaign } from '@/types/super-admin.types';

export function CampaignsTable() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<MarketingCampaign | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);

  const { data: campaigns = [], isLoading } = useMarketingCampaigns();
  const launchCampaign = useLaunchCampaign();
  const pauseCampaign = usePauseCampaign();

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'outline',
      scheduled: 'secondary',
      active: 'default',
      paused: 'destructive',
      completed: 'secondary',
    };
    return variants[status] || 'outline';
  };

  const columns: ColumnDef<MarketingCampaign>[] = [
    {
      accessorKey: 'name',
      header: 'Campaign Name',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-sm text-muted-foreground capitalize">
            {row.original.campaign_type.replace(/_/g, ' ')}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={getStatusVariant(row.original.status)}>
          {row.original.status.toUpperCase()}
        </Badge>
      ),
    },
    {
      accessorKey: 'target_audience',
      header: 'Target Audience',
      cell: ({ row }) => (
        <span className="capitalize">
          {row.original.target_audience.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      accessorKey: 'performance',
      header: 'Performance',
      cell: ({ row }) => {
        const sent = row.original.emails_sent || 0;
        const opened = row.original.emails_opened || 0;
        const clicked = row.original.clicks || 0;
        const openRate = sent > 0 ? ((opened / sent) * 100).toFixed(1) : '0';
        
        return (
          <div className="text-sm">
            <div className="font-medium">{sent} sent</div>
            <div className="text-muted-foreground">
              {openRate}% open • {clicked} clicks
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'starts_at',
      header: 'Start Date',
      cell: ({ row }) => {
        const date = row.original.starts_at;
        return new Date(date).toLocaleDateString();
      },
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
              <DropdownMenuItem
                onClick={() => {
                  setSelectedCampaign(campaign);
                  setStatsOpen(true);
                }}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View Stats
              </DropdownMenuItem>
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
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
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
    state: {
      sorting,
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Marketing Campaigns</CardTitle>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
          <div className="flex items-center justify-between mt-4">
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
        </CardContent>
      </Card>

      {/* Stats Dialog */}
      <CampaignStats
        campaign={selectedCampaign}
        open={statsOpen}
        onOpenChange={setStatsOpen}
      />
    </div>
  );
}

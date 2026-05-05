import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Play, Download, AlertTriangle, CheckCircle2 } from 'lucide-react'
import {
  ASSET_GROUP_LABELS,
  useApplyAssetGroupMapping,
  useAssetGroupPreview,
  type PreviewRow,
} from '@/hooks/useAssetGroupMapping'
import { useHotelContext } from '@/contexts/HotelContext'

export default function AssetGroupMigrationPage() {
  const { selectedHotel } = useHotelContext()
  const [enabled, setEnabled] = useState(false)
  const [overrideExisting, setOverrideExisting] = useState(false)
  const [showApplyConfirm, setShowApplyConfirm] = useState(false)

  const { data: rows, isLoading, refetch } = useAssetGroupPreview(enabled)
  const apply = useApplyAssetGroupMapping()

  const stats = useMemo(() => {
    if (!rows) return { total: 0, willMap: 0, needsReview: 0, unmapped: 0 }
    return {
      total: rows.length,
      willMap: rows.filter((r) => r.suggested_group !== null).length,
      needsReview: rows.filter((r) => r.needs_review).length,
      unmapped: rows.filter((r) => r.suggested_group === null).length,
    }
  }, [rows])

  const handleRunPreview = () => {
    setEnabled(true)
    setTimeout(() => refetch(), 50)
  }

  const handleApply = () => {
    apply.mutate(overrideExisting, { onSuccess: () => refetch() })
    setShowApplyConfirm(false)
  }

  const exportFlaggedCsv = () => {
    if (!rows) return
    const flagged = rows.filter((r) => r.needs_review)
    const header = ['code', 'name', 'item_type', 'suggested_group', 'confidence']
    const csv = [
      header.join(','),
      ...flagged.map((r) =>
        [r.item_code, r.item_name, r.item_type, r.suggested_group ?? '', r.confidence]
          .map((v) => `"${(v ?? '').toString().replace(/"/g, '""')}"`)
          .join(','),
      ),
    ].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `asset-review-${selectedHotel?.code ?? 'all'}-${Date.now()}.csv`
    a.click()
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Phân loại tài sản (mới)"
        description="Hệ thống tự động gán nhóm cho từng tài sản. Chạy thử trước khi áp dụng."
      />

      <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
        <p className="text-xs text-muted-foreground">
          Phạm vi: <span className="font-medium text-foreground">
            {selectedHotel ? selectedHotel.name : 'Tất cả khách sạn trong tenant'}
          </span>
        </p>
        <div className="flex items-center gap-2 text-xs">
          <Switch
            id="override"
            checked={overrideExisting}
            onCheckedChange={setOverrideExisting}
          />
          <label htmlFor="override" className="cursor-pointer">
            Ghi đè tài sản đã có nhóm (mặc định: chỉ điền nhóm cho tài sản chưa có)
          </label>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" onClick={handleRunPreview} type="button">
            <Play className="h-3.5 w-3.5 mr-1.5" />
            Chạy thử
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={() => setShowApplyConfirm(true)}
            disabled={!rows || stats.willMap === 0 || apply.isPending}
            type="button"
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            Áp dụng ({stats.willMap})
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={exportFlaggedCsv}
            disabled={!rows || stats.needsReview === 0}
            type="button"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Xuất CSV cần xem lại ({stats.needsReview})
          </Button>
        </div>
      </div>

      {enabled && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatCard label="Tổng" value={stats.total} />
          <StatCard label="Sẽ gán nhóm" value={stats.willMap} tone="green" />
          <StatCard label="Cần xem lại" value={stats.needsReview} tone="amber" />
          <StatCard label="Chưa gán được" value={stats.unmapped} tone="red" />
        </div>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Đang phân tích...</p>}

      {rows && (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Mã</TableHead>
                <TableHead className="text-xs">Tên</TableHead>
                <TableHead className="text-xs">Loại hiện tại</TableHead>
                <TableHead className="text-xs">Nhóm hiện tại</TableHead>
                <TableHead className="text-xs">Nhóm đề xuất</TableHead>
                <TableHead className="text-xs">Độ tin cậy</TableHead>
                <TableHead className="text-xs">Cờ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-8">
                    Không có tài sản nào.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <PreviewRowItem key={r.item_id} row={r} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={showApplyConfirm} onOpenChange={setShowApplyConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận áp dụng phân loại</AlertDialogTitle>
            <AlertDialogDescription>
              Sẽ cập nhật <strong>{stats.willMap}</strong> tài sản. Trong đó{' '}
              <strong>{stats.needsReview}</strong> tài sản sẽ được đánh dấu "cần xem lại".
              {overrideExisting && (
                <span className="block mt-2 text-amber-600">
                  ⚠ Bạn đã bật "Ghi đè" — các tài sản đã có nhóm cũng sẽ bị thay.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction onClick={handleApply}>Áp dụng</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'green' | 'amber' | 'red'
}) {
  const colorMap = {
    green: 'text-green-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
  }
  return (
    <div className="border rounded-lg p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-semibold ${tone ? colorMap[tone] : ''}`}>{value}</p>
    </div>
  )
}

function PreviewRowItem({ row }: { row: PreviewRow }) {
  const confidenceColor =
    row.confidence === 'high'
      ? 'text-green-600'
      : row.confidence === 'medium'
      ? 'text-amber-600'
      : 'text-red-600'
  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{row.item_code ?? '—'}</TableCell>
      <TableCell className="text-sm">{row.item_name}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{row.item_type}</TableCell>
      <TableCell className="text-xs">
        {row.current_group ? ASSET_GROUP_LABELS[row.current_group] : '—'}
      </TableCell>
      <TableCell className="text-xs">
        {row.suggested_group ? (
          <Badge variant="outline">{ASSET_GROUP_LABELS[row.suggested_group]}</Badge>
        ) : (
          <span className="text-red-600">Không xác định</span>
        )}
      </TableCell>
      <TableCell className={`text-xs ${confidenceColor}`}>{row.confidence}</TableCell>
      <TableCell>
        {row.needs_review && (
          <Badge variant="outline" className="text-amber-600 border-amber-600">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Xem lại
          </Badge>
        )}
      </TableCell>
    </TableRow>
  )
}

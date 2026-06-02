import { ActionBucket, BucketRow } from './ActionBucket'
import type { ActionBuckets } from '@/hooks/useRoomsNeedingActionToday'

interface ActionRowProps {
  data?: ActionBuckets
  loading?: boolean
}

function fmtTime(t: string | null): string {
  return t || '—'
}

function fmtRelative(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600_000)
  if (h < 1) return 'vừa xong'
  if (h < 24) return `${h}h trước`
  const d = Math.floor(h / 24)
  return `${d} ngày trước`
}

export function ActionRow({ data, loading }: ActionRowProps) {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg h-[180px] animate-pulse bg-muted/30" />
        ))}
      </div>
    )
  }

  const { checkoutNotCleaned, missingItems, rejectedQc, urgent } = data

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <ActionBucket
        title="Trả phòng chưa dọn"
        count={checkoutNotCleaned.length}
        emptyText="Đã dọn xong tất cả"
        tone="danger"
        viewAllTo="/rooms?view=grid&status=vacant_dirty"
      >
        {checkoutNotCleaned.slice(0, 6).map((r) => (
          <BucketRow
            key={r.roomId}
            to={`/rooms/${r.roomId}`}
            primary={`P${r.roomNumber}`}
            secondary={r.guestName || 'Khách vãng lai'}
            trailing={fmtTime(r.expectedTime)}
            trailingTone="danger"
          />
        ))}
      </ActionBucket>

      <ActionBucket
        title="Thiếu đồ"
        count={missingItems.length}
        emptyText="Đủ đồ"
        tone="danger"
        viewAllTo="/rooms?view=grid&missing=1"
      >
        {missingItems.slice(0, 6).map((r) => (
          <BucketRow
            key={r.roomId}
            to={`/rooms/${r.roomId}`}
            primary={`P${r.roomNumber}`}
            secondary={`Thiếu ${r.missingCount} món`}
            trailing={`×${r.missingCount}`}
            trailingTone="danger"
          />
        ))}
      </ActionBucket>

      <ActionBucket
        title="QC không đạt"
        count={rejectedQc.length}
        emptyText="Không có"
        tone="warning"
        viewAllTo="/housekeeping/review"
      >
        {rejectedQc.slice(0, 6).map((t) => (
          <BucketRow
            key={t.taskId}
            to="/housekeeping/review"
            primary={t.roomNumber ? `P${t.roomNumber}` : 'Task'}
            secondary={t.assigneeName || 'Chưa giao'}
            trailing={fmtRelative(t.rejectedAt)}
            trailingTone="warning"
          />
        ))}
      </ActionBucket>

      <ActionBucket
        title="Task khẩn"
        count={urgent.length}
        emptyText="Không có"
        tone="danger"
        viewAllTo="/my-tasks"
      >
        {urgent.slice(0, 6).map((t) => (
          <BucketRow
            key={t.taskId}
            to="/my-tasks"
            primary={t.roomNumber ? `P${t.roomNumber}` : 'Task'}
            secondary={t.title}
            trailing="Khẩn"
            trailingTone="danger"
          />
        ))}
      </ActionBucket>
    </div>
  )
}

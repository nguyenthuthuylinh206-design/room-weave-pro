import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { BookingDetailPage } from '@/pages/bookings/BookingDetailPage'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

interface Props {
  bookingId: string | null
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function BookingDetailDialog({ bookingId, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[92vh] w-[95vw] max-w-5xl flex-col gap-0 overflow-hidden p-0"
      >
        <VisuallyHidden>
          <DialogTitle>Phiếu booking</DialogTitle>
        </VisuallyHidden>
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {bookingId && (
            <BookingDetailPage
              idProp={bookingId}
              embedded
              onClose={() => onOpenChange(false)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

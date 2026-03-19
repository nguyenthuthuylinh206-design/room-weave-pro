import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail } from 'lucide-react'
import { GuestInvoice } from '@/hooks/useGuestInvoices'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'

interface Props {
  invoice: GuestInvoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function SendInvoiceEmailDialog({ invoice, open, onOpenChange }: Props) {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const handleOpen = () => {
    if (invoice) {
      setEmail(invoice.guest_email || invoice.guest_phone || '')
    }
  }

  const handleSend = async () => {
    if (!invoice || !email.trim()) return
    setSending(true)
    try {
      const { error } = await supabase.functions.invoke('send-invoice-email', {
        body: { invoice_id: invoice.id, to_email: email.trim() },
      })
      if (error) throw error

      queryClient.invalidateQueries({ queryKey: ['guest-invoices'] })
      toast({ title: 'Đã gửi hóa đơn qua email' })
      onOpenChange(false)
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Lỗi gửi email', description: err.message })
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (v) handleOpen(); onOpenChange(v) }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="text-sm">Gửi hóa đơn qua email</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            Gửi hóa đơn <span className="font-mono font-medium">{invoice?.invoice_number}</span> cho khách {invoice?.guest_name}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Email người nhận *</Label>
            <Input className="h-8" type="email" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => onOpenChange(false)}>Hủy</Button>
            <Button type="button" size="sm" className="h-8" onClick={handleSend} disabled={!email.trim() || sending}>
              <Mail className="h-3.5 w-3.5 mr-1" /> {sending ? 'Đang gửi...' : 'Gửi email'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
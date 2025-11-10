import { useState } from 'react'
import { Mail } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

interface EmailSchedulerProps {
  reportType: string
  reportFilters?: any
}

export function EmailScheduler({ reportType, reportFilters }: EmailSchedulerProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  
  const [formData, setFormData] = useState({
    recipients: '',
    frequency: 'daily',
    time: '18:00',
    format: 'both',
  })
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // TODO: Save to database
    console.log('Schedule report:', {
      reportType,
      reportFilters,
      ...formData,
      recipients: formData.recipients.split(',').map(e => e.trim()),
    })
    
    toast({
      title: 'Thành công',
      description: 'Đã lên lịch gửi báo cáo tự động',
    })
    
    setOpen(false)
  }
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Mail className="mr-2 h-4 w-4" />
          Lên lịch email
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lên lịch gửi báo cáo tự động</DialogTitle>
          <DialogDescription>
            Báo cáo sẽ được gửi tự động qua email theo lịch đã đặt
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="recipients">Email người nhận *</Label>
            <Input
              id="recipients"
              type="text"
              placeholder="email1@example.com, email2@example.com"
              value={formData.recipients}
              onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Nhập nhiều email, cách nhau bằng dấu phẩy
            </p>
          </div>
          
          <div>
            <Label htmlFor="frequency">Tần suất *</Label>
            <Select
              value={formData.frequency}
              onValueChange={(value) => setFormData({ ...formData, frequency: value })}
            >
              <SelectTrigger id="frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Hàng ngày</SelectItem>
                <SelectItem value="weekly">Hàng tuần (Thứ 2)</SelectItem>
                <SelectItem value="monthly">Hàng tháng (Ngày 1)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="time">Thời gian gửi *</Label>
            <Input
              id="time"
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="format">Định dạng file *</Label>
            <Select
              value={formData.format}
              onValueChange={(value) => setFormData({ ...formData, format: value })}
            >
              <SelectTrigger id="format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="both">Cả PDF & Excel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button type="submit">
              Lên lịch
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

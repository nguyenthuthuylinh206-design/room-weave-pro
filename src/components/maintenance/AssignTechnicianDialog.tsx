import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAssignRequest } from '@/hooks/useMaintenanceRequests'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface AssignTechnicianDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  requestId: string
}

export const AssignTechnicianDialog = ({
  open,
  onOpenChange,
  requestId,
}: AssignTechnicianDialogProps) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const assignRequest = useAssignRequest()

  // Fetch technicians/staff
  const { data: users, isLoading } = useQuery({
    queryKey: ['users-technicians'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, avatar_url, role')
        .in('role', ['admin', 'manager', 'staff'])
        .eq('status', 'active')
        .order('full_name')

      if (error) throw error
      return data
    },
  })

  const handleAssign = async () => {
    if (!selectedUserId) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng chọn người xử lý',
        variant: 'destructive',
      })
      return
    }

    try {
      await assignRequest.mutateAsync({
        id: requestId,
        assigned_to: selectedUserId,
      })
      toast({
        title: 'Đã gán thành công',
        description: 'Yêu cầu đã được gán cho người xử lý',
      })
      onOpenChange(false)
      setSelectedUserId('')
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể gán yêu cầu',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gán người xử lý</DialogTitle>
          <DialogDescription>
            Chọn nhân viên để xử lý yêu cầu bảo trì này
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="technician">Người xử lý</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={isLoading}>
              <SelectTrigger id="technician">
                <SelectValue placeholder="Chọn người xử lý" />
              </SelectTrigger>
              <SelectContent>
                {users?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={user.avatar_url || ''} />
                        <AvatarFallback>
                          {user.full_name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span>{user.full_name}</span>
                      <span className="text-xs text-muted-foreground">({user.role})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleAssign} disabled={!selectedUserId || assignRequest.isPending}>
            {assignRequest.isPending ? 'Đang gán...' : 'Gán'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import { useMemo, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { useEffectivePermissions } from '@/hooks/useEffectivePermissions'
import { toast } from 'sonner'
import { mapDbError } from '@/lib/dbErrors'
import type { AppRole } from '@/types/database.types'

const ALL_ROLES: { value: AppRole; label: string; level: number }[] = [
  { value: 'super_admin', label: 'Super Admin', level: 100 },
  { value: 'owner', label: 'Chủ khách sạn', level: 80 },
  { value: 'hotel_manager', label: 'Quản lý khách sạn', level: 60 },
  { value: 'department_manager', label: 'Quản lý bộ phận', level: 40 },
  { value: 'staff', label: 'Nhân viên', level: 20 },
]

interface Props {
  userId: string
  userName?: string
  open: boolean
  onOpenChange: (v: boolean) => void
}

/**
 * Dialog gán nhiều vai trò cho 1 user.
 * Ghi vào bảng `user_roles` (đã có UNIQUE(user_id, role)).
 */
export function MultiRoleManagerDialog({ userId, userName, open, onOpenChange }: Props) {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<Set<AppRole>>(new Set())

  const { data: currentRoles, isLoading } = useQuery({
    queryKey: ['user-multi-roles', userId],
    enabled: open && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', userId)
      if (error) throw error
      return (data ?? []).map((r: any) => r.role as AppRole)
    },
  })

  useEffect(() => {
    if (currentRoles) setSelected(new Set(currentRoles))
  }, [currentRoles])

  const { data: effective } = useEffectivePermissions(open ? userId : null)

  const warnings = useMemo(() => {
    const w: string[] = []
    if (selected.has('super_admin') && selected.size > 1) {
      w.push('Vai trò Super Admin đã có toàn quyền — các vai trò khác là dư thừa.')
    }
    if (selected.has('owner') && (selected.has('hotel_manager') || selected.has('department_manager'))) {
      w.push('Owner đã bao trọn quyền của Manager — không cần kèm vai trò Manager.')
    }
    if (selected.has('staff') && (selected.has('hotel_manager') || selected.has('owner') || selected.has('super_admin'))) {
      w.push('Vai trò Staff sẽ bị bao trọn bởi vai trò cấp cao hơn.')
    }
    if (selected.size === 0) w.push('User chưa có vai trò nào — sẽ không truy cập được app.')
    return w
  }, [selected])

  const save = useMutation({
    mutationFn: async () => {
      const current = new Set(currentRoles ?? [])
      const target = new Set(selected)
      const toAdd: AppRole[] = [...target].filter((r) => !current.has(r))
      const toRemove: AppRole[] = [...current].filter((r) => !target.has(r))

      if (toRemove.length > 0) {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .in('role', toRemove)
        if (error) throw error
      }
      if (toAdd.length > 0) {
        const { error } = await supabase
          .from('user_roles')
          .insert(toAdd.map((role) => ({ user_id: userId, role })))
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-multi-roles', userId] })
      qc.invalidateQueries({ queryKey: ['effective-permissions', userId] })
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['user', userId] })
      toast.success('Đã cập nhật vai trò')
      onOpenChange(false)
    },
    onError: (err: any) => toast.error(mapDbError(err?.message ?? err)),
  })

  const toggle = (role: AppRole) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(role) ? next.delete(role) : next.add(role)
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quản lý vai trò {userName ? `· ${userName}` : ''}</DialogTitle>
          <DialogDescription>Một user có thể có nhiều vai trò. Quyền hiệu lực = hợp của tất cả vai trò.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="space-y-2">
            {ALL_ROLES.map((r) => (
              <label
                key={r.value}
                htmlFor={`role-${r.value}`}
                className="flex items-center gap-3 border rounded-md p-2.5 cursor-pointer hover:bg-muted/40"
              >
                <Checkbox
                  id={`role-${r.value}`}
                  checked={selected.has(r.value)}
                  onCheckedChange={() => toggle(r.value)}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">{r.label}</div>
                  <div className="text-[11px] text-muted-foreground">Cấp {r.level}</div>
                </div>
              </label>
            ))}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="border border-amber-200 bg-amber-50 rounded-md p-2 space-y-1">
            {warnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-700">
                ⚠ {w}
              </p>
            ))}
          </div>
        )}

        <div className="text-[11px] text-muted-foreground">
          Quyền hiệu lực: <span className="font-medium">{effective?.length ?? 0}</span> quyền (union từ mọi vai trò)
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || isLoading}>
            Lưu vai trò
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

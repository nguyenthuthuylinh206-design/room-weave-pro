import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { useUsers } from '@/hooks/useUsers'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Users, Plus } from 'lucide-react'
import { UserTable } from '@/components/users/UserTable'
import { UserFilters } from '@/components/users/UserFilters'

export default function UsersPage() {
  const { users, isLoading } = useUsers()
  const [filters, setFilters] = useState({
    search: '',
    role: 'all',
    status: 'all',
  })

  const filteredUsers = users?.filter((user) => {
    const matchesSearch = user.full_name
      .toLowerCase()
      .includes(filters.search.toLowerCase()) ||
      user.email.toLowerCase().includes(filters.search.toLowerCase())
    
    const matchesRole = filters.role === 'all' || user.role === filters.role
    const matchesStatus = filters.status === 'all' || user.status === filters.status

    return matchesSearch && matchesRole && matchesStatus
  })

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý người dùng"
        description="Quản lý tài khoản và phân quyền người dùng trong hệ thống"
        action={{
          label: 'Thêm người dùng',
          icon: Plus,
          onClick: () => {
            // TODO: Open add user dialog
          },
        }}
      />

      <UserFilters filters={filters} onFiltersChange={setFilters} />

      {!filteredUsers || filteredUsers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Chưa có người dùng"
          description="Bắt đầu bằng cách thêm người dùng mới vào hệ thống"
          action={{
            label: 'Thêm người dùng',
            onClick: () => {
              // TODO: Open add user dialog
            },
          }}
        />
      ) : (
        <UserTable users={filteredUsers} />
      )}
    </div>
  )
}

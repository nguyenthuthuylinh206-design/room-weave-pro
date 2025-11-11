import { useState } from 'react'
import { Shield, Plus, Edit, Trash2, Users } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import {
  useRolesManagement,
  usePermissionsList,
  type Role,
  type RoleWithPermissions,
} from '@/hooks/useRolesManagement'

export default function RolesManagementPage() {
  const {
    roles,
    isLoading,
    createRole,
    updateRole,
    deleteRole,
    assignPermissions,
    fetchRoleWithPermissions,
  } = useRolesManagement()

  const { permissionsByModule, isLoading: permissionsLoading } = usePermissionsList()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false)

  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null)
  const [roleWithPermissions, setRoleWithPermissions] = useState<RoleWithPermissions | null>(null)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    hierarchy_level: 5,
  })

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      hierarchy_level: 5,
    })
    setEditingRole(null)
  }

  const handleCreate = () => {
    resetForm()
    setCreateDialogOpen(true)
  }

  const handleEdit = (role: Role) => {
    setEditingRole(role)
    setFormData({
      code: role.code,
      name: role.name,
      description: role.description || '',
      hierarchy_level: role.hierarchy_level,
    })
    setEditDialogOpen(true)
  }

  const handleDelete = (roleId: string) => {
    setDeletingRoleId(roleId)
    setDeleteDialogOpen(true)
  }

  const handleManagePermissions = async (role: Role) => {
    const roleWithPerms = await fetchRoleWithPermissions(role.id)
    setRoleWithPermissions(roleWithPerms)
    setSelectedPermissions(roleWithPerms.permissions.map((p) => p.id))
    setPermissionsDialogOpen(true)
  }

  const handleSubmitCreate = async () => {
    await createRole.mutateAsync(formData)
    setCreateDialogOpen(false)
    resetForm()
  }

  const handleSubmitEdit = async () => {
    if (!editingRole) return
    await updateRole.mutateAsync({ id: editingRole.id, ...formData })
    setEditDialogOpen(false)
    resetForm()
  }

  const handleConfirmDelete = async () => {
    if (!deletingRoleId) return
    await deleteRole.mutateAsync(deletingRoleId)
    setDeleteDialogOpen(false)
    setDeletingRoleId(null)
  }

  const handleSavePermissions = async () => {
    if (!roleWithPermissions) return
    await assignPermissions.mutateAsync({
      roleId: roleWithPermissions.id,
      permissionIds: selectedPermissions,
    })
    setPermissionsDialogOpen(false)
    setRoleWithPermissions(null)
    setSelectedPermissions([])
  }

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    )
  }

  const getModuleName = (module: string) => {
    const names: Record<string, string> = {
      items: 'Quản lý Tài sản',
      rooms: 'Quản lý Phòng',
      laundry: 'Quản lý Giặt là',
      inventory: 'Quản lý Kho',
      maintenance: 'Quản lý Bảo trì',
      reports: 'Báo cáo & Phân tích',
      vendors: 'Quản lý Nhà cung cấp',
      settings: 'Cài đặt',
      users: 'Quản lý Người dùng',
    }
    return names[module] || module
  }

  if (isLoading || permissionsLoading) {
    return <LoadingSpinner fullScreen />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vai trò & Phân quyền"
        description="Quản lý vai trò và quyền truy cập của người dùng trong hệ thống"
      >
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Thêm vai trò
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles?.map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{role.name}</CardTitle>
                </div>
                {role.is_system && (
                  <Badge variant="secondary" className="text-xs">
                    Hệ thống
                  </Badge>
                )}
              </div>
              <CardDescription>{role.description || 'Không có mô tả'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>Cấp độ: {role.hierarchy_level}</span>
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleManagePermissions(role)}
                  >
                    <Shield className="h-4 w-4 mr-1" />
                    Phân quyền
                  </Button>

                  {!role.is_system && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(role)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(role.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo vai trò mới</DialogTitle>
            <DialogDescription>
              Thêm vai trò mới và phân quyền cho người dùng
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Mã vai trò</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="vd: manager"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Tên vai trò</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="vd: Quản lý"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả vai trò..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hierarchy">Cấp độ phân cấp (1-5)</Label>
              <Input
                id="hierarchy"
                type="number"
                min="1"
                max="5"
                value={formData.hierarchy_level}
                onChange={(e) =>
                  setFormData({ ...formData, hierarchy_level: parseInt(e.target.value) })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSubmitCreate} disabled={createRole.isPending}>
              Tạo vai trò
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa vai trò</DialogTitle>
            <DialogDescription>Cập nhật thông tin vai trò</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-code">Mã vai trò</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Tên vai trò</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Mô tả</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-hierarchy">Cấp độ phân cấp (1-5)</Label>
              <Input
                id="edit-hierarchy"
                type="number"
                min="1"
                max="5"
                value={formData.hierarchy_level}
                onChange={(e) =>
                  setFormData({ ...formData, hierarchy_level: parseInt(e.target.value) })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSubmitEdit} disabled={updateRole.isPending}>
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa vai trò này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permissions Dialog */}
      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Phân quyền cho vai trò: {roleWithPermissions?.name}</DialogTitle>
            <DialogDescription>
              Chọn các quyền cho vai trò này
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {permissionsByModule &&
              Object.entries(permissionsByModule).map(([module, permissions]) => (
                <div key={module} className="space-y-3">
                  <h4 className="font-semibold text-sm">{getModuleName(module)}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {permissions.map((permission) => (
                      <div
                        key={permission.id}
                        className="flex items-start space-x-2 p-2 rounded border"
                      >
                        <Checkbox
                          id={permission.id}
                          checked={selectedPermissions.includes(permission.id)}
                          onCheckedChange={() => togglePermission(permission.id)}
                        />
                        <div className="flex-1">
                          <label
                            htmlFor={permission.id}
                            className="text-sm font-medium leading-none cursor-pointer"
                          >
                            {permission.name}
                          </label>
                          {permission.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {permission.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator />
                </div>
              ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermissionsDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSavePermissions} disabled={assignPermissions.isPending}>
              Lưu phân quyền
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ArrowLeft, PackageX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { MobileCategoryCard } from './MobileCategoryCard'
import { CategoryFormSheet } from './CategoryFormSheet'
import { PullToRefresh } from '@/components/mobile'
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/hooks/useCategories'
import type { CategoryWithStats, CategoryFormData } from '@/types/items.types'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

export function MobileCategoriesPage() {
  const navigate = useNavigate()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryWithStats | null>(null)
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null)
  
  const { data: categories, isLoading, refetch } = useCategories()
  const createMutation = useCreateCategory()
  const updateMutation = useUpdateCategory()
  const deleteMutation = useDeleteCategory()
  
  const handleOpenForm = (category?: CategoryWithStats) => {
    setEditingCategory(category || null)
    setIsFormOpen(true)
  }
  
  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingCategory(null)
  }
  
  const handleSubmit = async (data: CategoryFormData) => {
    try {
      if (editingCategory) {
        await updateMutation.mutateAsync({ id: editingCategory.id, data })
      } else {
        await createMutation.mutateAsync(data)
      }
      handleCloseForm()
    } catch (error) {
      // Error handled by mutation
    }
  }
  
  const handleDelete = async () => {
    if (!deletingCategoryId) return
    
    try {
      await deleteMutation.mutateAsync(deletingCategoryId)
      setDeletingCategoryId(null)
    } catch (error) {
      // Error handled by mutation
    }
  }
  
  const handleRefresh = async () => {
    await refetch()
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background border-b">
        <div className="p-4">
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/items')}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold flex-1">Danh mục tài sản</h1>
            <PermissionGate module="items" action="create">
              <Button
                size="icon"
                onClick={() => handleOpenForm()}
                className="rounded-full h-12 w-12 shrink-0"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </PermissionGate>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1">
        <PullToRefresh onRefresh={handleRefresh}>
          <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : !categories || categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <PackageX className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Chưa có danh mục</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                Tạo danh mục đầu tiên để bắt đầu phân loại tài sản
              </p>
              <PermissionGate module="items" action="create">
                <Button onClick={() => handleOpenForm()} className="h-12 gap-2">
                  <Plus className="h-4 w-4" />
                  Thêm danh mục đầu tiên
                </Button>
              </PermissionGate>
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map((category) => (
                <MobileCategoryCard
                  key={category.id}
                  category={category}
                  onEdit={handleOpenForm}
                  onDelete={setDeletingCategoryId}
                />
              ))}
            </div>
          )}
          </div>
        </PullToRefresh>
      </div>
      
      {/* Form Sheet */}
      <CategoryFormSheet
        open={isFormOpen}
        onOpenChange={handleCloseForm}
        category={editingCategory}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />
      
      {/* Delete Dialog */}
      <AlertDialog open={!!deletingCategoryId} onOpenChange={(open) => !open && setDeletingCategoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa danh mục này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

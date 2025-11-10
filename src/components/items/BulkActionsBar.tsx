import { X, Trash2, FileDown, QrCode, Ban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useDeleteItems } from '@/hooks/useItems'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'

interface BulkActionsBarProps {
  selectedCount: number
  selectedItems: string[]
  onClearSelection: () => void
}

export function BulkActionsBar({
  selectedCount,
  selectedItems,
  onClearSelection,
}: BulkActionsBarProps) {
  const deleteItems = useDeleteItems()
  
  const handleDelete = async () => {
    await deleteItems.mutateAsync(selectedItems)
    onClearSelection()
  }
  
  const handleExport = () => {
    // TODO: Implement Excel export with XLSX library
    console.log('Export selected items:', selectedItems)
  }
  
  const handlePrintQR = () => {
    // Generate multiple QR codes and open print dialog
    const qrCodes = selectedItems.map(id => 
      `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${id}`
    ).join(',')
    
    // Open in new window for batch printing
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Codes - Print</title>
            <style>
              body { display: flex; flex-wrap: wrap; gap: 20px; padding: 20px; }
              .qr-item { page-break-inside: avoid; text-align: center; }
              img { display: block; margin: 0 auto; }
              @media print { .no-print { display: none; } }
            </style>
          </head>
          <body>
            ${selectedItems.map(id => `
              <div class="qr-item">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${id}" />
                <p>${id}</p>
              </div>
            `).join('')}
            <button class="no-print" onclick="window.print()">Print All</button>
          </body>
        </html>
      `)
      printWindow.document.close()
    }
  }
  
  const handleDiscontinue = async () => {
    // Bulk update items to discontinued status
    try {
      const { error } = await supabase
        .from('items')
        .update({ status: 'discontinued' })
        .in('id', selectedItems)
      
      if (error) throw error
      
      toast({
        title: 'Thành công',
        description: `Đã ngừng kinh doanh ${selectedItems.length} items`,
      })
      onClearSelection()
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      })
    }
  }
  
  return (
    <Card className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 shadow-lg">
      <div className="flex items-center gap-4 p-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            Đã chọn {selectedCount} items
          </span>
        </div>
        
        <div className="h-4 w-px bg-border" />
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <FileDown className="mr-2 h-4 w-4" />
            Xuất Excel
          </Button>
          
          <Button variant="outline" size="sm" onClick={handlePrintQR}>
            <QrCode className="mr-2 h-4 w-4" />
            In QR
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleDiscontinue}>
            <Ban className="mr-2 h-4 w-4" />
            Ngừng KD
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Xóa
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
                <AlertDialogDescription>
                  Bạn có chắc muốn xóa {selectedCount} items đã chọn?
                  Hành động này không thể hoàn tác.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Hủy</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Xóa
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </Card>
  )
}

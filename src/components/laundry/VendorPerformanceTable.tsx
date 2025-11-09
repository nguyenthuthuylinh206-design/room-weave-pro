import { useNavigate } from 'react-router-dom'
import { Star, TrendingUp, Package } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useLaundryVendors } from '@/hooks/useLaundryVendors'

export function VendorPerformanceTable() {
  const navigate = useNavigate()
  const { data: vendors, isLoading } = useLaundryVendors({ status: 'active' })
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }
  
  // Sort by rating
  const topVendors = vendors?.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5) || []
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Hiệu suất đơn vị giặt</CardTitle>
          <button
            onClick={() => navigate('/laundry/vendors')}
            className="text-sm text-primary hover:underline"
          >
            Xem tất cả
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {topVendors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              Chưa có đơn vị giặt nào
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {topVendors.map((vendor) => (
              <div
                key={vendor.id}
                className="flex items-center gap-4 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/laundry/vendors/${vendor.id}`)}
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={(vendor.contract_info as any)?.logo_url} />
                  <AvatarFallback>
                    {vendor.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{vendor.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {vendor.type === 'external' ? 'Bên ngoài' : 'Nội bộ'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">
                        {vendor.rating?.toFixed(1) || '0.0'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Hiệu suất</span>
                      <span className="font-medium">
                        {vendor.rating ? Math.round((vendor.rating / 5) * 100) : 0}%
                      </span>
                    </div>
                    <Progress value={vendor.rating ? (vendor.rating / 5) * 100 : 0} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

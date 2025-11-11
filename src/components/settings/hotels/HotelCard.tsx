import { Card } from '@/components/ui/card'
import { Hotel } from '@/hooks/useHotels'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Users, 
  Bed, 
  Package,
  Wrench,
  Shirt,
  MoreVertical, 
  Edit, 
  Eye, 
  XCircle,
  Trash2,
  Globe
} from 'lucide-react'

interface HotelCardProps {
  hotel: Hotel
  onEdit: (hotel: Hotel) => void
  onDelete: (hotel: Hotel) => void
  onView?: (hotel: Hotel) => void
  onDeactivate?: (hotel: Hotel) => void
}

export function HotelCard({ hotel, onEdit, onDelete, onView, onDeactivate }: HotelCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-600 border-green-500/20'
      case 'inactive':
        return 'bg-red-500/10 text-red-600 border-red-500/20'
      case 'maintenance':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const getTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        {/* Left: Icon + Content */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="p-3 rounded-lg bg-primary/10 flex-shrink-0">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          
          <div className="flex-1 space-y-3 min-w-0">
            {/* Header */}
            <div>
              <h3 className="text-xl font-semibold mb-1">{hotel.name}</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{hotel.code}</Badge>
                <Badge variant="outline">{getTypeLabel(hotel.type)}</Badge>
                <Badge className={getStatusColor(hotel.status)}>
                  {hotel.status === 'active' ? '🟢' : hotel.status === 'inactive' ? '🔴' : '🟡'} {hotel.status.toUpperCase()}
                </Badge>
              </div>
            </div>

            {/* Location & Contact */}
            <div className="space-y-1.5 text-sm">
              {hotel.address && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-1">
                    {hotel.address}
                    {hotel.city && `, ${hotel.city}`}
                    {hotel.country && `, ${hotel.country}`}
                  </span>
                </div>
              )}
              <div className="flex flex-wrap gap-4 text-muted-foreground">
                {hotel.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{hotel.phone}</span>
                  </div>
                )}
                {hotel.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{hotel.email}</span>
                  </div>
                )}
                {hotel.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <a 
                      href={hotel.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline truncate"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Website
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-3 border-t">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <div className="p-2 rounded-md bg-primary/10">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold">{hotel._count?.users || 0}</span>
                  <span className="text-xs text-muted-foreground">Staff</span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                <div className="p-2 rounded-md bg-blue-500/10">
                  <Bed className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold">{hotel._count?.rooms || 0}</span>
                  <span className="text-xs text-muted-foreground">Rooms</span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
                <div className="p-2 rounded-md bg-orange-500/10">
                  <Package className="h-4 w-4 text-orange-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold">{hotel._count?.items || 0}</span>
                  <span className="text-xs text-muted-foreground">Items</span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                <div className="p-2 rounded-md bg-purple-500/10">
                  <Shirt className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold">{hotel._count?.laundry_batches || 0}</span>
                  <span className="text-xs text-muted-foreground">Laundry</span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                <div className="p-2 rounded-md bg-yellow-500/10">
                  <Wrench className="h-4 w-4 text-yellow-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold">{hotel._count?.maintenance_requests || 0}</span>
                  <span className="text-xs text-muted-foreground">Maintenance</span>
                </div>
              </div>
            </div>

            {/* Manager */}
            {hotel.manager_name && (
              <div className="text-sm pt-2 border-t">
                <span className="text-muted-foreground">Manager: </span>
                <span className="font-medium">{hotel.manager_name}</span>
                {hotel.manager_email && (
                  <span className="text-muted-foreground ml-2">({hotel.manager_email})</span>
                )}
              </div>
            )}

            {/* Creation date */}
            <div className="text-xs text-muted-foreground">
              Created: {new Date(hotel.created_at).toLocaleDateString()}
              {hotel.inactive_at && (
                <span className="ml-3">
                  • Deactivated: {new Date(hotel.inactive_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="flex-shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onView && (
              <DropdownMenuItem onClick={() => onView(hotel)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onEdit(hotel)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            {hotel.status === 'active' && onDeactivate && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDeactivate(hotel)}
                  className="text-yellow-600"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Deactivate
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete(hotel)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  )
}

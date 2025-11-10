import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'

export interface HotelFiltersState {
  status: string
  type: string
  city: string
  manager_id: string
  search: string
}

interface HotelFiltersProps {
  filters: HotelFiltersState
  onFiltersChange: (filters: Partial<HotelFiltersState>) => void
  cities: string[]
  managers: Array<{ id: string; name: string }>
}

export function HotelFilters({ filters, onFiltersChange, cities, managers }: HotelFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search hotels by name, code, or address..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ search: e.target.value })}
          className="pl-10"
        />
      </div>

      <Select value={filters.status} onValueChange={(value) => onFiltersChange({ status: value })}>
        <SelectTrigger className="w-full sm:w-[150px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
          <SelectItem value="maintenance">Maintenance</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.type} onValueChange={(value) => onFiltersChange({ type: value })}>
        <SelectTrigger className="w-full sm:w-[150px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="hotel">Hotel</SelectItem>
          <SelectItem value="resort">Resort</SelectItem>
          <SelectItem value="apartment">Apartment</SelectItem>
          <SelectItem value="hostel">Hostel</SelectItem>
          <SelectItem value="other">Other</SelectItem>
        </SelectContent>
      </Select>

      {cities.length > 0 && (
        <Select value={filters.city} onValueChange={(value) => onFiltersChange({ city: value })}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="City" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {managers.length > 0 && (
        <Select value={filters.manager_id} onValueChange={(value) => onFiltersChange({ manager_id: value })}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Manager" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Managers</SelectItem>
            {managers.map((manager) => (
              <SelectItem key={manager.id} value={manager.id}>
                {manager.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}

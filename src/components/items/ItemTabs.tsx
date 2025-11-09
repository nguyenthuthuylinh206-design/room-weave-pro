import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Shirt, Sparkles, Tv, Sofa, Droplets, Package } from 'lucide-react'
import { useCategories } from '@/hooks/useCategories'
import { Skeleton } from '@/components/ui/skeleton'

interface ItemTabsProps {
  activeTab: string
  onTabChange: (categoryId: string) => void
}

export function ItemTabs({ activeTab, onTabChange }: ItemTabsProps) {
  const { data: categories, isLoading } = useCategories()
  
  if (isLoading) {
    return (
      <div className="flex gap-2">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-24" />
        ))}
      </div>
    )
  }
  
  const iconMap: Record<string, any> = {
    shirt: Shirt,
    sparkles: Sparkles,
    tv: Tv,
    sofa: Sofa,
    spray: Droplets,
  }
  
  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="all" className="gap-2">
          <Package className="h-4 w-4" />
          <span>Tất cả</span>
          <span className="ml-1 text-xs text-muted-foreground">
            ({categories?.reduce((sum, cat) => sum + cat.items_count, 0) || 0})
          </span>
        </TabsTrigger>
        
        {categories?.map((category) => {
          const Icon = iconMap[category.icon] || Package
          
          return (
            <TabsTrigger key={category.id} value={category.id} className="gap-2">
              <Icon className="h-4 w-4" style={{ color: category.color }} />
              <span>{category.name}</span>
              <span className="ml-1 text-xs text-muted-foreground">
                ({category.items_count})
              </span>
            </TabsTrigger>
          )
        })}
      </TabsList>
    </Tabs>
  )
}

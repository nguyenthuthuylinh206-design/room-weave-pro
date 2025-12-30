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
      <div className="flex gap-1.5">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-20" />
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
      <TabsList className="h-8 w-full justify-start gap-0.5 overflow-x-auto bg-transparent p-0">
        <TabsTrigger 
          value="all" 
          className="h-8 gap-1.5 px-3 text-xs data-[state=active]:bg-muted"
        >
          <Package className="h-3.5 w-3.5" />
          Tất cả
          <span className="text-muted-foreground">
            {categories?.reduce((sum, cat) => sum + cat.items_count, 0) || 0}
          </span>
        </TabsTrigger>
        
        {categories?.map((category) => {
          const Icon = iconMap[category.icon] || Package
          
          return (
            <TabsTrigger 
              key={category.id} 
              value={category.id} 
              className="h-8 gap-1.5 px-3 text-xs data-[state=active]:bg-muted"
            >
              <Icon className="h-3.5 w-3.5" style={{ color: category.color }} />
              {category.name}
              <span className="text-muted-foreground">
                {category.items_count}
              </span>
            </TabsTrigger>
          )
        })}
      </TabsList>
    </Tabs>
  )
}

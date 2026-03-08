import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { 
  HelpCircle, 
  ChevronRight,
  ArrowRight,
  Lightbulb,
  Search
} from 'lucide-react'
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { helpGuides, type HelpGuide } from '@/data/helpGuides'
import { useBreakpoint } from '@/lib/breakpoints'

const GuideCard = ({ guide }: { guide: HelpGuide }) => {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const Icon = guide.icon

  return (
    <div className="border rounded-lg">
      <button
        type="button"
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-accent/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{guide.title}</p>
          <p className="text-xs text-muted-foreground truncate">{guide.description}</p>
        </div>
        <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          <div className="space-y-1.5 pl-2 border-l-2 border-primary/20 ml-4">
            {guide.steps.map((step, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="text-xs font-mono text-primary font-medium shrink-0 mt-0.5">
                  {idx + 1}.
                </span>
                <div>
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          {guide.tips && guide.tips.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/20 rounded-md p-2.5 space-y-1">
              <div className="flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-medium text-amber-700 dark:text-amber-500">Mẹo</span>
              </div>
              {guide.tips.map((tip, idx) => (
                <p key={idx} className="text-xs text-amber-700 dark:text-amber-400">• {tip}</p>
              ))}
            </div>
          )}

          {guide.navigateTo && (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => navigate(guide.navigateTo!)}
            >
              <ArrowRight className="h-3 w-3 mr-1.5" />
              Đi tới trang
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default function HelpPage() {
  const { t } = useTranslation('common')
  const { isMobile } = useBreakpoint()
  const [searchQuery, setSearchQuery] = useState('')

  const filterGuides = (guides: HelpGuide[]) => {
    if (!searchQuery.trim()) return guides
    const q = searchQuery.toLowerCase()
    return guides.filter(g =>
      g.title.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q) ||
      g.steps.some(s => s.title.toLowerCase().includes(q))
    )
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b">
          <div className="px-4 py-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <HelpCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Hướng dẫn sử dụng</h1>
                <p className="text-xs text-muted-foreground">Chọn vai trò để xem hướng dẫn phù hợp</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm hướng dẫn..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <Accordion type="single" collapsible className="space-y-2">
            {helpGuides.map(role => {
              const filtered = filterGuides(role.guides)
              if (filtered.length === 0) return null
              return (
                <AccordionItem key={role.roleId} value={role.roleId} className="border rounded-lg px-3">
                  <AccordionTrigger className="py-3 text-sm font-semibold hover:no-underline">
                    <div className="text-left">
                      <p>{role.roleLabel}</p>
                      <p className="text-xs font-normal text-muted-foreground">{filtered.length} bài hướng dẫn</p>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-2 pb-3">
                    {filtered.map(guide => (
                      <GuideCard key={guide.id} guide={guide} />
                    ))}
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Hướng dẫn sử dụng</h1>
        <p className="mt-1 text-muted-foreground">Chọn vai trò để xem hướng dẫn các chức năng phù hợp</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm hướng dẫn..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      <Tabs defaultValue="housekeeping">
        <TabsList className="w-full justify-start">
          {helpGuides.map(role => (
            <TabsTrigger key={role.roleId} value={role.roleId} className="text-sm">
              {role.roleLabel}
            </TabsTrigger>
          ))}
        </TabsList>

        {helpGuides.map(role => {
          const filtered = filterGuides(role.guides)
          return (
            <TabsContent key={role.roleId} value={role.roleId} className="space-y-3">
              <p className="text-sm text-muted-foreground">{role.roleDescription}</p>
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Không tìm thấy hướng dẫn phù hợp</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {filtered.map(guide => (
                    <GuideCard key={guide.id} guide={guide} />
                  ))}
                </div>
              )}
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}

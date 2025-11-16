import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PriorityBadge } from './PriorityBadge'
import { MapPin, Clock, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useState } from 'react'

interface ActiveRequestsSectionProps {
  requests: {
    urgent: any[]
    high: any[]
    medium: any[]
    low: any[]
  }
}

export const ActiveRequestsSection = ({ requests }: ActiveRequestsSectionProps) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    urgent: true,
    high: false,
    medium: false,
    low: false,
  })

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const renderRequestCard = (request: any) => (
    <Card key={request.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <Link
                to={`/maintenance/requests/${request.id}`}
                className="font-medium hover:underline"
              >
                {request.request_code}
              </Link>
              <p className="text-sm text-muted-foreground">{request.title}</p>
            </div>
            <PriorityBadge priority={request.priority} />
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {request.room && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>Phòng {request.room.room_number}</span>
              </div>
            )}
            {!request.room && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>{request.location}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatDistanceToNow(new Date(request.reported_at), { addSuffix: true, locale: vi })}</span>
            </div>
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{request.reporter?.full_name || 'N/A'}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to={`/maintenance/requests/${request.id}`}>Xem chi tiết</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderSection = (priority: string, label: string, icon: string, requests: any[]) => {
    if (requests.length === 0) return null

    return (
      <Collapsible
        open={openSections[priority]}
        onOpenChange={() => toggleSection(priority)}
        className="space-y-2"
      >
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-muted p-3 hover:bg-muted/80">
          <div className="flex items-center gap-2">
            <span className="text-xl">{icon}</span>
            <span className="font-medium">{label}</span>
            <Badge variant="secondary">{requests.length} yêu cầu</Badge>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2">
          {requests.slice(0, 5).map(renderRequestCard)}
          {requests.length > 5 && (
            <Button variant="link" className="w-full" asChild>
              <Link to={`/maintenance/requests?priority=${priority}`}>
                Xem tất cả {requests.length} yêu cầu
              </Link>
            </Button>
          )}
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Yêu cầu đang hoạt động</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderSection('urgent', 'KHẨN CẤP', '🔴', requests.urgent)}
        {renderSection('high', 'CAO', '🟠', requests.high)}
        {renderSection('medium', 'TRUNG BÌNH', '🟡', requests.medium)}
        {renderSection('low', 'THẤP', '🟢', requests.low)}

        {requests.urgent.length === 0 &&
          requests.high.length === 0 &&
          requests.medium.length === 0 &&
          requests.low.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Không có yêu cầu đang hoạt động
            </p>
          )}
      </CardContent>
    </Card>
  )
}

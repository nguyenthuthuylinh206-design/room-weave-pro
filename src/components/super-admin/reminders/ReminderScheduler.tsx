import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Send } from 'lucide-react';

export function ReminderScheduler() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Sample data - would come from API
  const scheduledReminders = [
    {
      id: '1',
      tenant: 'Hotel Paradise',
      type: '7 days before',
      scheduledFor: '2024-01-20 09:00',
      status: 'pending',
    },
    {
      id: '2',
      tenant: 'Sunset Resort',
      type: '3 days before',
      scheduledFor: '2024-01-20 14:00',
      status: 'pending',
    },
  ];

  const upcomingReminders = [
    { date: '2024-01-21', count: 5 },
    { date: '2024-01-22', count: 3 },
    { date: '2024-01-23', count: 8 },
    { date: '2024-01-24', count: 2 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Reminder Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />

              <div className="flex-1">
                <h3 className="font-semibold mb-4">
                  {format(selectedDate, 'MMMM d, yyyy')}
                </h3>
                
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {scheduledReminders.map((reminder) => (
                      <div
                        key={reminder.id}
                        className="p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium">{reminder.tenant}</p>
                            <p className="text-sm text-muted-foreground">{reminder.type}</p>
                          </div>
                          <Badge variant="secondary">{reminder.status}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {reminder.scheduledFor}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Reminders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingReminders.map((item) => (
                <div
                  key={item.date}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted"
                >
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {format(new Date(item.date), 'MMM d')}
                    </span>
                  </div>
                  <Badge variant="outline">{item.count} reminders</Badge>
                </div>
              ))}
            </div>

            <Button className="w-full mt-4">
              <Send className="h-4 w-4 mr-2" />
              Send All Pending
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">12</p>
              <p className="text-sm text-blue-700">Today</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-3xl font-bold text-green-600">45</p>
              <p className="text-sm text-green-700">This Week</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-3xl font-bold text-purple-600">128</p>
              <p className="text-sm text-purple-700">This Month</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-3xl font-bold text-orange-600">5</p>
              <p className="text-sm text-orange-700">Overdue</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

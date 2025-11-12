import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RenewalReminder } from '@/types/super-admin.types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export function RenewalRemindersTable() {
  const { data: reminders, isLoading } = useQuery({
    queryKey: ['renewal-reminders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('renewal_reminders')
        .select(`
          *,
          tenant:tenants(id, name, current_period_end)
        `)
        .order('scheduled_for', { ascending: true })
        .limit(50);

      if (error) throw error;
      return data as any[];
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getReminderTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      '7_days': '7 ngày',
      '3_days': '3 ngày',
      '1_day': '1 ngày',
      'expired': 'Đã hết hạn',
      'grace_period_ending': 'Hết grace period',
    };
    return labels[type] || type;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nhắc nhở gia hạn</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Loại nhắc nhở</TableHead>
              <TableHead>Thời gian gửi</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày hết hạn</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reminders?.map((reminder) => (
              <TableRow key={reminder.id}>
                <TableCell>
                  <div className="font-medium">
                    {reminder.tenant?.name || 'N/A'}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {getReminderTypeLabel(reminder.reminder_type)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {format(
                      new Date(reminder.scheduled_for),
                      'dd/MM/yyyy HH:mm'
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(reminder.status)}
                    <span className="text-sm capitalize">
                      {reminder.status}
                    </span>
                  </div>
                  {reminder.error_message && (
                    <p className="text-xs text-red-600 mt-1">
                      {reminder.error_message}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  {(reminder.tenant as any)?.current_period_end && (
                    <div className="text-sm">
                      {format(
                        new Date(
                          (reminder.tenant as any).current_period_end
                        ),
                        'dd/MM/yyyy'
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

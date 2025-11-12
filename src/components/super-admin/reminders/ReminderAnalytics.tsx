import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export function ReminderAnalytics() {
  // Sample data
  const deliveryData = [
    { date: 'Jan 15', sent: 45, delivered: 43, opened: 28, clicked: 12 },
    { date: 'Jan 16', sent: 38, delivered: 37, opened: 24, clicked: 10 },
    { date: 'Jan 17', sent: 52, delivered: 50, opened: 35, clicked: 15 },
    { date: 'Jan 18', sent: 41, delivered: 40, opened: 30, clicked: 14 },
    { date: 'Jan 19', sent: 48, delivered: 47, opened: 32, clicked: 16 },
  ];

  const effectivenessData = [
    { type: '7 Days Before', sent: 120, conversions: 45 },
    { type: '3 Days Before', sent: 95, conversions: 52 },
    { type: '1 Day Before', sent: 78, conversions: 38 },
    { type: 'Grace Period', sent: 42, conversions: 28 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reminder Analytics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Delivery Performance */}
        <div>
          <h3 className="font-medium mb-4">Delivery Performance (Last 5 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={deliveryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="sent" stroke="#8b5cf6" strokeWidth={2} />
              <Line type="monotone" dataKey="delivered" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="opened" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="clicked" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Template Effectiveness */}
        <div>
          <h3 className="font-medium mb-4">Template Effectiveness</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={effectivenessData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="sent" fill="#8b5cf6" />
              <Bar dataKey="conversions" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">95.2%</p>
            <p className="text-sm text-muted-foreground">Delivery Rate</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">68.5%</p>
            <p className="text-sm text-muted-foreground">Open Rate</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">42.3%</p>
            <p className="text-sm text-muted-foreground">Conversion Rate</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

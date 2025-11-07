import Layout from "@/components/Layout";
import StatCard from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, DoorOpen, Shirt, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";

const Dashboard = () => {
  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your hotel operations</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Items"
            value="1,247"
            icon={Package}
            variant="primary"
            trend={{ value: "12% from last month", positive: true }}
          />
          <StatCard
            title="Active Rooms"
            value="42"
            icon={DoorOpen}
            variant="accent"
            trend={{ value: "95% occupancy", positive: true }}
          />
          <StatCard
            title="In Laundry"
            value="156"
            icon={Shirt}
            variant="default"
          />
          <StatCard
            title="Low Stock Alerts"
            value="8"
            icon={AlertTriangle}
            variant="warning"
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Inventory Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Inventory Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <InventoryBar label="In Stock" value={68} color="bg-success" />
                <InventoryBar label="In Use (Rooms)" value={22} color="bg-primary" />
                <InventoryBar label="In Laundry" value={8} color="bg-accent" />
                <InventoryBar label="Damaged/Lost" value={2} color="bg-destructive" />
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <ActivityItem
                  title="Laundry batch LB-20250107-0123 delivered"
                  time="2 hours ago"
                  type="laundry"
                />
                <ActivityItem
                  title="Room 305 cleaning completed"
                  time="4 hours ago"
                  type="room"
                />
                <ActivityItem
                  title="Low stock alert: Bath towels"
                  time="6 hours ago"
                  type="alert"
                />
                <ActivityItem
                  title="Purchase order PO-20250107-0045 received"
                  time="1 day ago"
                  type="purchase"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Items Requiring Attention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-sm font-medium text-muted-foreground">
                    <th className="pb-3">Item</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3">Current Stock</th>
                    <th className="pb-3">Minimum</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <StockRow
                    item="Bath Towels"
                    category="Fabric"
                    current={45}
                    minimum={80}
                    status="low"
                  />
                  <StockRow
                    item="Bed Sheets (Queen)"
                    category="Fabric"
                    current={32}
                    minimum={50}
                    status="low"
                  />
                  <StockRow
                    item="Shampoo Bottles"
                    category="Amenities"
                    current={120}
                    minimum={100}
                    status="ok"
                  />
                  <StockRow
                    item="Pillows"
                    category="Furniture"
                    current={15}
                    minimum={30}
                    status="critical"
                  />
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

// Helper Components
const InventoryBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div>
    <div className="mb-1 flex items-center justify-between text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <span className="text-muted-foreground">{value}%</span>
    </div>
    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div className={`h-full ${color} transition-all`} style={{ width: `${value}%` }} />
    </div>
  </div>
);

const ActivityItem = ({ title, time, type }: { title: string; time: string; type: string }) => {
  const icons = {
    laundry: Shirt,
    room: DoorOpen,
    alert: AlertTriangle,
    purchase: Package,
  };
  const Icon = icons[type as keyof typeof icons] || Package;

  return (
    <div className="flex items-start gap-3">
      <div className="rounded-lg bg-secondary p-2">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{time}</p>
      </div>
    </div>
  );
};

const StockRow = ({
  item,
  category,
  current,
  minimum,
  status,
}: {
  item: string;
  category: string;
  current: number;
  minimum: number;
  status: "ok" | "low" | "critical";
}) => {
  const statusConfig = {
    ok: { label: "Adequate", color: "bg-success/10 text-success" },
    low: { label: "Low Stock", color: "bg-warning/10 text-warning" },
    critical: { label: "Critical", color: "bg-destructive/10 text-destructive" },
  };

  const config = statusConfig[status];

  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-3 font-medium text-foreground">{item}</td>
      <td className="py-3 text-muted-foreground">{category}</td>
      <td className="py-3 text-foreground">{current}</td>
      <td className="py-3 text-muted-foreground">{minimum}</td>
      <td className="py-3">
        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${config.color}`}>
          {config.label}
        </span>
      </td>
    </tr>
  );
};

export default Dashboard;

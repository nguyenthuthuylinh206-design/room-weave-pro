import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Download } from "lucide-react";

const Inventory = () => {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Inventory Management</h1>
            <p className="text-muted-foreground">Manage your hotel items and stock levels</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search items..." className="pl-9" />
              </div>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </Button>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-sm font-medium text-muted-foreground">
                    <th className="pb-3">Code</th>
                    <th className="pb-3">Name</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3">Total</th>
                    <th className="pb-3">In Stock</th>
                    <th className="pb-3">In Use</th>
                    <th className="pb-3">In Laundry</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <ItemRow
                    code="FAB-001234"
                    name="Bath Towel - White"
                    category="Fabric"
                    total={250}
                    inStock={45}
                    inUse={180}
                    inLaundry={20}
                    status="low"
                  />
                  <ItemRow
                    code="FAB-001235"
                    name="Bed Sheet - Queen"
                    category="Fabric"
                    total={180}
                    inStock={32}
                    inUse={140}
                    inLaundry={8}
                    status="low"
                  />
                  <ItemRow
                    code="AMN-002341"
                    name="Shampoo 30ml"
                    category="Amenities"
                    total={500}
                    inStock={320}
                    inUse={180}
                    inLaundry={0}
                    status="ok"
                  />
                  <ItemRow
                    code="AMN-002342"
                    name="Soap Bar"
                    category="Amenities"
                    total={600}
                    inStock={420}
                    inUse={180}
                    inLaundry={0}
                    status="ok"
                  />
                  <ItemRow
                    code="FUR-003456"
                    name="Pillow"
                    category="Furniture"
                    total={120}
                    inStock={15}
                    inUse={100}
                    inLaundry={0}
                    status="critical"
                  />
                  <ItemRow
                    code="CLN-004567"
                    name="Toilet Paper"
                    category="Cleaning"
                    total={800}
                    inStock={650}
                    inUse={150}
                    inLaundry={0}
                    status="ok"
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

const ItemRow = ({
  code,
  name,
  category,
  total,
  inStock,
  inUse,
  inLaundry,
  status,
}: {
  code: string;
  name: string;
  category: string;
  total: number;
  inStock: number;
  inUse: number;
  inLaundry: number;
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
      <td className="py-3 font-mono text-xs text-muted-foreground">{code}</td>
      <td className="py-3 font-medium text-foreground">{name}</td>
      <td className="py-3 text-muted-foreground">{category}</td>
      <td className="py-3 font-medium text-foreground">{total}</td>
      <td className="py-3 text-foreground">{inStock}</td>
      <td className="py-3 text-muted-foreground">{inUse}</td>
      <td className="py-3 text-muted-foreground">{inLaundry}</td>
      <td className="py-3">
        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${config.color}`}>
          {config.label}
        </span>
      </td>
      <td className="py-3">
        <Button variant="ghost" size="sm">
          View
        </Button>
      </td>
    </tr>
  );
};

export default Inventory;

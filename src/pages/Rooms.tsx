import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DoorOpen, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const Rooms = () => {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Room Management</h1>
            <p className="text-muted-foreground">Monitor and manage all hotel rooms</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Room
          </Button>
        </div>

        {/* Status Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatusCard label="Vacant" count={8} color="success" />
          <StatusCard label="Occupied" count={34} color="primary" />
          <StatusCard label="Cleaning" count={5} color="warning" />
          <StatusCard label="Maintenance" count={1} color="destructive" />
        </div>

        {/* Rooms Grid */}
        <div>
          <h2 className="mb-4 text-xl font-semibold text-foreground">All Rooms</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <RoomCard
              number="101"
              type="Standard"
              status="vacant"
              floor={1}
              itemsComplete={true}
            />
            <RoomCard
              number="102"
              type="Standard"
              status="occupied"
              floor={1}
              itemsComplete={true}
            />
            <RoomCard
              number="103"
              type="Deluxe"
              status="occupied"
              floor={1}
              itemsComplete={true}
            />
            <RoomCard
              number="104"
              type="Standard"
              status="cleaning"
              floor={1}
              itemsComplete={false}
            />
            <RoomCard
              number="201"
              type="Deluxe"
              status="occupied"
              floor={2}
              itemsComplete={true}
            />
            <RoomCard
              number="202"
              type="Suite"
              status="vacant"
              floor={2}
              itemsComplete={true}
            />
            <RoomCard
              number="203"
              type="Deluxe"
              status="occupied"
              floor={2}
              itemsComplete={true}
            />
            <RoomCard
              number="204"
              type="Standard"
              status="maintenance"
              floor={2}
              itemsComplete={false}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};

const StatusCard = ({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: "success" | "primary" | "warning" | "destructive";
}) => {
  const colorClasses = {
    success: "bg-success/10 border-success/20 text-success",
    primary: "bg-primary/10 border-primary/20 text-primary",
    warning: "bg-warning/10 border-warning/20 text-warning",
    destructive: "bg-destructive/10 border-destructive/20 text-destructive",
  };

  return (
    <Card className={cn("border", colorClasses[color])}>
      <CardContent className="p-4">
        <div className="text-center">
          <p className="text-3xl font-bold">{count}</p>
          <p className="text-sm font-medium opacity-80">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
};

const RoomCard = ({
  number,
  type,
  status,
  floor,
  itemsComplete,
}: {
  number: string;
  type: string;
  status: "vacant" | "occupied" | "cleaning" | "maintenance";
  floor: number;
  itemsComplete: boolean;
}) => {
  const statusConfig = {
    vacant: { label: "Vacant", color: "bg-success text-success-foreground" },
    occupied: { label: "Occupied", color: "bg-primary text-primary-foreground" },
    cleaning: { label: "Cleaning", color: "bg-warning text-warning-foreground" },
    maintenance: { label: "Maintenance", color: "bg-destructive text-destructive-foreground" },
  };

  const config = statusConfig[status];

  return (
    <Card className="group cursor-pointer transition-all hover:shadow-md">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-secondary p-2">
                <DoorOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">Room {number}</p>
                <p className="text-xs text-muted-foreground">Floor {floor}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Type</span>
              <span className="text-sm font-medium text-foreground">{type}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge className={config.color}>{config.label}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Items</span>
              <span
                className={cn(
                  "text-xs font-medium",
                  itemsComplete ? "text-success" : "text-warning"
                )}
              >
                {itemsComplete ? "Complete" : "Missing items"}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Rooms;

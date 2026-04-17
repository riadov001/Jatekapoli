import { useLocation } from "wouter";
import { ArrowLeft, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useListDrivers, useUpdateDriver } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminDriversPage() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: drivers, isLoading, refetch } = useListDrivers();
  const updateDriver = useUpdateDriver();

  const toggleAvailable = (id: number, current: boolean) => {
    updateDriver.mutate({ id, data: { isAvailable: !current } }, {
      onSuccess: () => { toast({ title: "Driver status updated" }); refetch(); },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/dashboard")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="font-display font-bold text-xl">Manage Drivers</h1>
          <p className="text-muted-foreground text-sm">{drivers?.length ?? 0} drivers</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-card-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Driver</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Vehicle</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Orders</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i}><td colSpan={4} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td></tr>
              ))
            ) : (drivers ?? []).map((driver) => (
              <tr key={driver.id} className="border-b border-border last:border-0" data-testid={`row-driver-${driver.id}`}>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium">{driver.userName}</p>
                    <p className="text-xs text-muted-foreground">Rating: {driver.rating?.toFixed(1) ?? "N/A"}</p>
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground capitalize">{driver.vehicleType}</td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{driver.deliveriesCount}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={driver.isAvailable}
                      onCheckedChange={() => toggleAvailable(driver.id, driver.isAvailable)}
                      data-testid={`switch-available-${driver.id}`}
                    />
                    <Badge className={`text-xs border-0 ${driver.isAvailable ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {driver.isAvailable ? "Available" : "Offline"}
                    </Badge>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

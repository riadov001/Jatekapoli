import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useListOrders } from "@workspace/api-client-react";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  accepted: "bg-blue-100 text-blue-700",
  preparing: "bg-orange-100 text-orange-700",
  ready: "bg-purple-100 text-purple-700",
  picked_up: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-600",
};

export default function AdminOrdersPage() {
  const [_, setLocation] = useLocation();
  const { data: orders, isLoading } = useListOrders();

  const sorted = [...(orders ?? [])].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/dashboard")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="font-display font-bold text-xl">All Orders</h1>
          <p className="text-muted-foreground text-sm">{orders?.length ?? 0} total orders</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-card-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Restaurant</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Customer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Total</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}><td colSpan={5} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td></tr>
              ))
            ) : sorted.map((order) => (
              <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => setLocation(`/orders/${order.id}`)} data-testid={`row-order-${order.id}`}>
                <td className="px-4 py-3 font-medium">#{order.id}</td>
                <td className="px-4 py-3 text-muted-foreground">{order.restaurantName}</td>
                <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{order.userName}</td>
                <td className="px-4 py-3 hidden md:table-cell">{order.total.toFixed(0)} MAD</td>
                <td className="px-4 py-3">
                  <Badge className={`text-xs border-0 ${statusColors[order.status] || ""}`}>{order.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useLocation } from "wouter";
import { Package, ChevronRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useListOrders } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  accepted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  preparing: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  ready: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  picked_up: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  delivered: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  picked_up: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function OrdersPage() {
  const [_, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: orders, isLoading } = useListOrders(
    user ? { userId: user.id } : undefined,
    { query: { enabled: !!user } }
  );

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground mb-4">Please login to view your orders</p>
        <Button onClick={() => setLocation("/login")}>Login</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="font-display font-bold text-2xl">My Orders</h1>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 rounded-xl border border-card-border space-y-2">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  const sortedOrders = [...(orders ?? [])].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-4">
      <h1 className="font-display font-bold text-2xl">My Orders</h1>

      {sortedOrders.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="font-semibold text-lg mb-2">No orders yet</h2>
          <p className="text-muted-foreground text-sm mb-6">Place your first order from a local restaurant!</p>
          <Button onClick={() => setLocation("/")} data-testid="button-explore">Explore Restaurants</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedOrders.map((order) => (
            <button
              key={order.id}
              className="w-full text-left p-4 rounded-2xl border border-card-border bg-card hover:shadow-sm transition-all"
              onClick={() => setLocation(`/orders/${order.id}`)}
              data-testid={`card-order-${order.id}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{order.restaurantName}</span>
                  <Badge className={`text-xs px-2 py-0.5 rounded-full border-0 ${statusColors[order.status] || ""}`}>
                    {statusLabels[order.status] || order.status}
                  </Badge>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {order.items.length} item{order.items.length !== 1 ? "s" : ""} • {order.total.toFixed(0)} MAD
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

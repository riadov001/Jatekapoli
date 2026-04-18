import { useLocation } from "wouter";
import { Package, DollarSign, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useListRestaurants, useListOrders, useUpdateOrderStatus } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";

const ORDER_STATUSES = ["pending", "accepted", "preparing", "ready", "picked_up", "delivered", "cancelled"];

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  accepted: "bg-blue-100 text-blue-700",
  preparing: "bg-orange-100 text-orange-700",
  ready: "bg-purple-100 text-purple-700",
  picked_up: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-600",
};

export default function RestaurantDashboardPage() {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();

  const { data: restaurants } = useListRestaurants({ ownerId: user?.id });
  const myRestaurant = restaurants?.[0];

  const { data: orders, isLoading, refetch } = useListOrders(
    myRestaurant ? { restaurantId: myRestaurant.id } : undefined,
    { query: { enabled: !!myRestaurant } }
  );

  const updateStatus = useUpdateOrderStatus();

  const activeOrders = (orders ?? []).filter(o => !["delivered", "cancelled"].includes(o.status));
  const revenue = (orders ?? []).filter(o => o.status === "delivered").reduce((s, o) => s + o.total, 0);

  const handleStatusChange = (orderId: number, status: string) => {
    updateStatus.mutate({ id: orderId, data: { status: status as any } }, {
      onSuccess: () => { toast({ title: t("restaurantPanel.orderStatusUpdated") }); refetch(); },
    });
  };

  if (!myRestaurant) {
    return (
      <div className="text-center py-20">
        <p className="text-lg font-semibold mb-2">{t("restaurantPanel.noRestaurantFound")}</p>
        <p className="text-muted-foreground text-sm">{t("restaurantPanel.notLinked")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl">{myRestaurant.name}</h1>
          <p className="text-muted-foreground text-sm">{t("restaurantPanel.panel")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setLocation("/restaurant/menu")}>
            {t("restaurantPanel.manageMenu")}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border border-card-border p-4">
          <Package className="w-5 h-5 text-primary mb-2" />
          <p className="font-bold text-2xl">{activeOrders.length}</p>
          <p className="text-xs text-muted-foreground">{t("restaurantPanel.activeOrders")}</p>
        </div>
        <div className="bg-card rounded-2xl border border-card-border p-4">
          <DollarSign className="w-5 h-5 text-green-600 mb-2" />
          <p className="font-bold text-2xl">{revenue.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">{t("restaurantPanel.revenue")}</p>
        </div>
        <div className="bg-card rounded-2xl border border-card-border p-4">
          <TrendingUp className="w-5 h-5 text-blue-600 mb-2" />
          <p className="font-bold text-2xl">{orders?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground">{t("restaurantPanel.totalOrders")}</p>
        </div>
        <div className="bg-card rounded-2xl border border-card-border p-4">
          <Clock className="w-5 h-5 text-orange-600 mb-2" />
          <p className="font-bold text-2xl">{myRestaurant.deliveryTime ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{t("restaurantPanel.avgDelivery")}</p>
        </div>
      </div>

      {/* Active Orders */}
      <div>
        <h2 className="font-semibold mb-3">{t("restaurantPanel.activeOrdersList")}</h2>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-2xl">
            <p>{t("restaurantPanel.noActiveOrders")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeOrders.map((order) => (
              <div key={order.id} className="bg-card rounded-2xl border border-card-border p-4 flex items-center gap-4" data-testid={`card-order-${order.id}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">Order #{order.id}</span>
                    <Badge className={`text-xs border-0 ${statusColors[order.status]}`}>{t(`status.${order.status}`, { defaultValue: order.status })}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {order.items.length} item{order.items.length !== 1 ? "s" : ""} • {order.total.toFixed(0)} MAD
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{order.deliveryAddress}</p>
                </div>
                <Select
                  defaultValue={order.status}
                  onValueChange={(val) => handleStatusChange(order.id, val)}
                >
                  <SelectTrigger className="w-36 h-8 text-xs" data-testid={`select-status-${order.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{t(`status.${s}`, { defaultValue: s })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

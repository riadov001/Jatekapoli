import { useLocation } from "wouter";
import { Package, ChevronRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useListOrders } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";

const statusColors: Record<string, string> = {
  pending: "bg-brand-yellow-soft text-brand-yellow-foreground border border-brand-yellow/40",
  accepted: "bg-brand-turquoise-soft text-brand-turquoise border border-brand-turquoise/30",
  preparing: "bg-brand-turquoise-soft text-brand-turquoise border border-brand-turquoise/40",
  ready: "bg-brand-turquoise text-brand-turquoise-foreground",
  picked_up: "bg-primary text-primary-foreground",
  delivered: "bg-foreground text-background",
  cancelled: "bg-muted text-muted-foreground border border-border",
};

export default function OrdersPage() {
  const [_, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();

  const { data: orders, isLoading } = useListOrders(
    user ? { userId: user.id } : undefined,
    { query: { enabled: !!user } }
  );

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground mb-4">{t("orders.loginRequired")}</p>
        <Button onClick={() => setLocation("/login")}>{t("orders.login")}</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="font-display font-bold text-2xl">{t("orders.title")}</h1>
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
      <h1 className="font-display font-bold text-2xl">{t("orders.title")}</h1>

      {sortedOrders.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="font-semibold text-lg mb-2">{t("orders.noOrders")}</h2>
          <p className="text-muted-foreground text-sm mb-6">{t("orders.noOrdersDesc")}</p>
          <Button onClick={() => setLocation("/")} data-testid="button-explore">{t("orders.explore")}</Button>
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
                    {t(`status.${order.status}`, { defaultValue: order.status })}
                  </Badge>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {t("orders.item", { count: order.items.length })} • {order.total.toFixed(0)} MAD
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

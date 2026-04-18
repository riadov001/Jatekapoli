import { useLocation } from "wouter";
import { Users, Store, Truck, Package, TrendingUp, CheckCircle, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useListUsers, useListRestaurants, useListOrders, useListDrivers } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="bg-card rounded-2xl border border-card-border p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <p className="font-display font-bold text-2xl" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  const { t } = useTranslation();

  const { data: users, isLoading: usersLoading } = useListUsers();
  const { data: restaurants, isLoading: restsLoading } = useListRestaurants();
  const { data: orders, isLoading: ordersLoading } = useListOrders();
  const { data: drivers, isLoading: driversLoading } = useListDrivers();

  const recentOrders = [...(orders ?? [])].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 8);

  const totalRevenue = (orders ?? []).filter(o => o.status === "delivered").reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl">{t("admin.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("admin.welcomeBack", { name: user?.name })}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {usersLoading ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />) : (
          <>
            <StatCard label={t("admin.users")} value={users?.length ?? 0} icon={Users} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
            <StatCard label={t("admin.restaurants")} value={restaurants?.length ?? 0} icon={Store} color="bg-accent text-accent-foreground" />
            <StatCard label={t("admin.orders")} value={orders?.length ?? 0} icon={Package} color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
            <StatCard label={t("admin.revenue")} value={totalRevenue.toFixed(0)} icon={TrendingUp} color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => setLocation("/admin/users")} className="gap-2">
          <Users className="w-4 h-4" />{t("admin.manageUsers")}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setLocation("/admin/restaurants")} className="gap-2">
          <Store className="w-4 h-4" />{t("admin.manageRestaurants")}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setLocation("/admin/drivers")} className="gap-2">
          <Truck className="w-4 h-4" />{t("admin.manageDrivers")}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setLocation("/admin/orders")} className="gap-2">
          <Package className="w-4 h-4" />{t("admin.allOrders")}
        </Button>
      </div>

      {/* Recent orders */}
      <div>
        <h2 className="font-semibold mb-3">{t("admin.recentOrders")}</h2>
        <div className="bg-card rounded-2xl border border-card-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{t("admin.order")}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{t("admin.restaurant")}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">{t("admin.amount")}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{t("admin.status")}</th>
              </tr>
            </thead>
            <tbody>
              {ordersLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={4} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                  </tr>
                ))
              ) : recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => setLocation(`/orders/${order.id}`)}>
                  <td className="px-4 py-3 font-medium">#{order.id}</td>
                  <td className="px-4 py-3 text-muted-foreground">{order.restaurantName}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">{order.total.toFixed(0)} MAD</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                      order.status === "delivered" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                      order.status === "cancelled" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                    }`}>
                      {order.status === "delivered" ? <CheckCircle className="w-3 h-3" /> : order.status === "cancelled" ? <XCircle className="w-3 h-3" /> : null}
                      {t(`status.${order.status}`, { defaultValue: order.status })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

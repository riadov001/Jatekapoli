import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Users, Store, Truck, Package, TrendingUp, CheckCircle, XCircle, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useListUsers, useListRestaurants, useListOrders, useListDrivers } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  hint,
}: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  hint?: string;
}) {
  return (
    <div className="bg-card rounded-2xl border border-card-border p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <p
            className="font-display font-bold text-2xl"
            data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {value}
          </p>
          {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  delivered: "#10b981",
  pending: "#f59e0b",
  preparing: "#0ea5e9",
  ready: "#6366f1",
  picked_up: "#8b5cf6",
  on_the_way: "#06b6d4",
  cancelled: "#94a3b8",
};

export default function AdminDashboardPage() {
  const [_, setLocation] = useLocation();

  const { data: users, isLoading: usersLoading } = useListUsers();
  const { data: restaurants, isLoading: restsLoading } = useListRestaurants();
  const { data: orders, isLoading: ordersLoading } = useListOrders();
  const { data: drivers, isLoading: driversLoading } = useListDrivers();

  const [recentReviews, setRecentReviews] = useState<any[] | null>(null);
  const [openTickets, setOpenTickets] = useState<number | null>(null);

  useEffect(() => {
    const apiBase = (import.meta.env.BASE_URL?.replace(/\/$/, "") || "") + "/api";
    const token = localStorage.getItem("jatek_token");
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(`${apiBase}/reviews`)
      .then((r) => r.json())
      .then((rows) => Array.isArray(rows) ? setRecentReviews(rows) : setRecentReviews([]))
      .catch(() => setRecentReviews([]));

    fetch(`${apiBase}/support-tickets`, { headers })
      .then((r) => r.ok ? r.json() : [])
      .then((rows) => {
        const open = (rows ?? []).filter((t: any) => t.status === "open").length;
        setOpenTickets(open);
      })
      .catch(() => setOpenTickets(0));
  }, []);

  const recentOrders = [...(orders ?? [])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  const totalRevenue = (orders ?? [])
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + o.total, 0);

  const activeDrivers = (drivers ?? []).filter((d) => d.isAvailable).length;
  const openRestaurants = (restaurants ?? []).filter((r) => r.isOpen).length;

  // Build last-7-days revenue + count series
  const dailySeries = (() => {
    const days: { date: Date; key: string; label: string }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit" });
      days.push({ date: d, key, label });
    }
    return days.map(({ key, label }) => {
      const dayOrders = (orders ?? []).filter(
        (o) => new Date(o.createdAt).toISOString().slice(0, 10) === key
      );
      return {
        day: label,
        revenue: dayOrders
          .filter((o) => o.status === "delivered")
          .reduce((s, o) => s + o.total, 0),
        commandes: dayOrders.length,
      };
    });
  })();

  // Status breakdown for pie
  const statusBreakdown = (() => {
    const counts: Record<string, number> = {};
    (orders ?? []).forEach((o) => {
      counts[o.status] = (counts[o.status] ?? 0) + 1;
    });
    return Object.entries(counts).map(([status, value]) => ({ name: status, value }));
  })();

  const allLoading = usersLoading || restsLoading || ordersLoading || driversLoading;

  return (
    <AdminLayout title="Tableau de bord" subtitle="Vue globale de l'activité Jatek">
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {allLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : (
          <>
            <StatCard
              label="Utilisateurs"
              value={users?.length ?? 0}
              icon={Users}
              color="bg-brand-turquoise-soft text-brand-turquoise"
            />
            <StatCard
              label="Restaurants"
              value={restaurants?.length ?? 0}
              icon={Store}
              color="bg-brand-yellow-soft text-brand-yellow-foreground"
              hint={`${openRestaurants} ouverts`}
            />
            <StatCard
              label="Livreurs"
              value={drivers?.length ?? 0}
              icon={Truck}
              color="bg-accent text-primary"
              hint={`${activeDrivers} dispo`}
            />
            <StatCard
              label="Revenu total"
              value={`${totalRevenue.toFixed(0)} MAD`}
              icon={TrendingUp}
              color="bg-primary text-primary-foreground"
              hint={`${(orders ?? []).length} commandes`}
            />
          </>
        )}
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Tickets ouverts"
          value={openTickets ?? "—"}
          icon={Package}
          color="bg-orange-100 text-orange-600 dark:bg-orange-950/40"
        />
        <StatCard
          label="Avis"
          value={recentReviews?.length ?? "—"}
          icon={Star}
          color="bg-yellow-100 text-yellow-600 dark:bg-yellow-950/40"
        />
        <StatCard
          label="Livrées"
          value={(orders ?? []).filter((o) => o.status === "delivered").length}
          icon={CheckCircle}
          color="bg-green-100 text-green-600 dark:bg-green-950/40"
        />
        <StatCard
          label="Annulées"
          value={(orders ?? []).filter((o) => o.status === "cancelled").length}
          icon={XCircle}
          color="bg-muted text-muted-foreground"
        />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-2xl border border-card-border p-5 lg:col-span-2">
          <h3 className="font-semibold mb-4">Activité (7 derniers jours)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Revenu (MAD)"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="commandes"
                  name="Commandes"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-card-border p-5">
          <h3 className="font-semibold mb-4">Commandes par statut</h3>
          <div className="h-64">
            {statusBreakdown.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Aucune donnée
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(e: any) => e.name}
                  >
                    {statusBreakdown.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name] ?? "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent orders table */}
      <div>
        <h2 className="font-semibold mb-3">Commandes récentes</h2>
        <div className="bg-card rounded-2xl border border-card-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                  Commande
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                  Restaurant
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                  Montant
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody>
              {ordersLoading
                ? [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={4} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    </tr>
                  ))
                : recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                      onClick={() => setLocation(`/orders/${order.id}`)}
                    >
                      <td className="px-4 py-3 font-medium">#{order.id}</td>
                      <td className="px-4 py-3 text-muted-foreground">{order.restaurantName}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {order.total.toFixed(0)} MAD
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                            order.status === "delivered"
                              ? "bg-brand-turquoise text-brand-turquoise-foreground"
                              : order.status === "cancelled"
                              ? "bg-muted text-muted-foreground border border-border"
                              : order.status === "pending"
                              ? "bg-brand-yellow text-brand-yellow-foreground"
                              : "bg-brand-turquoise-soft text-brand-turquoise"
                          }`}
                        >
                          {order.status === "delivered" ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : order.status === "cancelled" ? (
                            <XCircle className="w-3 h-3" />
                          ) : null}
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

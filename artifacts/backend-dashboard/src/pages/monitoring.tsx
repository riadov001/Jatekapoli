import { useMemo } from "react";
import { useListBackendOrders, useListBackendDeliverymen, useGetBackendDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingCart,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  RefreshCw,
  Store,
  DollarSign,
  Users,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const REFETCH_INTERVAL = 15_000;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:    { label: "En attente",   color: "bg-yellow-100 text-yellow-800 border-yellow-200",  icon: Clock },
  confirmed:  { label: "Confirmée",    color: "bg-blue-100 text-blue-800 border-blue-200",        icon: CheckCircle },
  preparing:  { label: "En prépa.",    color: "bg-purple-100 text-purple-800 border-purple-200",  icon: Store },
  ready:      { label: "Prête",        color: "bg-indigo-100 text-indigo-800 border-indigo-200",  icon: CheckCircle },
  picked_up:  { label: "Récupérée",   color: "bg-cyan-100 text-cyan-800 border-cyan-200",        icon: Truck },
  delivering: { label: "En livraison", color: "bg-orange-100 text-orange-800 border-orange-200", icon: Truck },
  delivered:  { label: "Livrée",       color: "bg-green-100 text-green-800 border-green-200",    icon: CheckCircle },
  cancelled:  { label: "Annulée",      color: "bg-red-100 text-red-800 border-red-200",          icon: XCircle },
};

const ACTIVE_STATUSES = ["pending", "confirmed", "preparing", "ready", "picked_up", "delivering"];

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "bg-gray-100 text-gray-700", icon: Activity };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function KpiCard({ title, value, icon: Icon, sub, highlight = false }: {
  title: string; value: string | number; icon: React.ElementType; sub?: string; highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary/30 bg-primary/5" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`w-4 h-4 ${highlight ? "text-primary" : "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${highlight ? "text-primary" : ""}`}>{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function MonitoringPage() {
  const { data: activeOrders, isLoading: loadingOrders, dataUpdatedAt } = useListBackendOrders(
    { limit: 100 },
    { query: { refetchInterval: REFETCH_INTERVAL } }
  );

  const { data: deliverymen, isLoading: loadingDrivers } = useListBackendDeliverymen(
    { query: { refetchInterval: REFETCH_INTERVAL } }
  );

  const { data: stats, isLoading: loadingStats } = useGetBackendDashboard(
    { range: "today" as any },
    { query: { refetchInterval: REFETCH_INTERVAL } }
  );

  const activeList = useMemo(
    () => (activeOrders ?? []).filter((o) => ACTIVE_STATUSES.includes(o.status ?? "")),
    [activeOrders]
  );

  const byStatus = useMemo(() => {
    const map: Record<string, number> = {};
    for (const o of activeList) {
      map[o.status ?? "unknown"] = (map[o.status ?? "unknown"] ?? 0) + 1;
    }
    return map;
  }, [activeList]);

  const availableDrivers = useMemo(
    () => (deliverymen ?? []).filter((d: any) => d.isAvailable),
    [deliverymen]
  );

  const lastUpdated = dataUpdatedAt ? format(new Date(dataUpdatedAt), "HH:mm:ss") : "--:--:--";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Monitoring en temps réel</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Actualisé toutes les {REFETCH_INTERVAL / 1000}s — dernière mise à jour : {lastUpdated}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "4s" }} />
          Live
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loadingOrders ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <KpiCard
              title="Commandes actives"
              value={activeList.length}
              icon={ShoppingCart}
              sub="En cours de traitement"
              highlight={activeList.length > 0}
            />
            <KpiCard
              title="En livraison"
              value={byStatus["delivering"] ?? 0}
              icon={Truck}
              sub="Coursiers en route"
            />
            <KpiCard
              title="En attente"
              value={(byStatus["pending"] ?? 0) + (byStatus["confirmed"] ?? 0)}
              icon={Clock}
              sub="À traiter"
            />
            <KpiCard
              title="Livreurs disponibles"
              value={loadingDrivers ? "…" : availableDrivers.length}
              icon={Users}
              sub={`/ ${deliverymen?.length ?? "…"} total`}
            />
          </>
        )}
      </div>

      {/* Today's stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {loadingStats ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <KpiCard
              title="Commandes aujourd'hui"
              value={stats?.totalOrders ?? 0}
              icon={TrendingUp}
              sub={`${stats?.deliveredOrders ?? 0} livrées`}
            />
            <KpiCard
              title="Revenu du jour"
              value={`${Number(stats?.totalRevenue ?? 0).toFixed(0)} MAD`}
              icon={DollarSign}
              sub="Commandes livrées"
            />
            <KpiCard
              title="Taux de livraison"
              value={
                stats?.totalOrders
                  ? `${Math.round(((stats.deliveredOrders ?? 0) / stats.totalOrders) * 100)}%`
                  : "—"
              }
              icon={CheckCircle}
              sub="Livrées / Totales"
            />
          </>
        )}
      </div>

      {/* Status breakdown pills */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUS_CONFIG)
          .filter(([s]) => ACTIVE_STATUSES.includes(s))
          .map(([status, cfg]) => (
            <div key={status} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${cfg.color}`}>
              <cfg.icon className="w-3.5 h-3.5" />
              {cfg.label}
              <span className="ml-1 bg-white/60 rounded-full px-1.5 text-xs font-bold">
                {byStatus[status] ?? 0}
              </span>
            </div>
          ))}
      </div>

      {/* Live orders table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="w-4 h-4 text-primary" />
            Commandes actives ({activeList.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingOrders ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : activeList.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
              Aucune commande en cours — tout est calme !
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-muted-foreground text-xs">
                    <th className="text-left p-3 font-medium">Commande</th>
                    <th className="text-left p-3 font-medium">Client</th>
                    <th className="text-left p-3 font-medium">Restaurant</th>
                    <th className="text-left p-3 font-medium">Total</th>
                    <th className="text-left p-3 font-medium">Statut</th>
                    <th className="text-left p-3 font-medium">Heure</th>
                  </tr>
                </thead>
                <tbody>
                  {activeList.map((order, idx) => (
                    <tr key={order.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`}>
                      <td className="p-3 font-mono font-semibold text-xs">#{String(order.id).padStart(5, "0")}</td>
                      <td className="p-3 truncate max-w-[140px]">{(order as any).customerName ?? (order as any).customer?.name ?? "—"}</td>
                      <td className="p-3 truncate max-w-[140px]">{(order as any).shopName ?? (order as any).shop?.name ?? "—"}</td>
                      <td className="p-3 font-semibold whitespace-nowrap">{Number(order.total ?? 0).toFixed(2)} MAD</td>
                      <td className="p-3"><StatusBadge status={order.status ?? ""} /></td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {order.createdAt ? format(new Date(order.createdAt), "HH:mm", { locale: fr }) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drivers panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="w-4 h-4 text-primary" />
            Livreurs ({deliverymen?.length ?? "…"})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingDrivers ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
            </div>
          ) : !deliverymen?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">Aucun livreur enregistré</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {deliverymen.map((driver: any) => (
                <div key={driver.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {driver.avatarUrl ? (
                      <img src={driver.avatarUrl} alt={driver.name} className="w-full h-full object-cover" />
                    ) : (
                      <Truck className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{driver.name ?? driver.phone ?? "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{driver.phone ?? ""}</p>
                  </div>
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${driver.isAvailable ? "bg-green-500" : "bg-gray-300"}`} title={driver.isAvailable ? "Disponible" : "Indisponible"} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

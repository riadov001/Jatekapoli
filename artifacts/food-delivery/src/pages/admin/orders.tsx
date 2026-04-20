import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Search, Eye, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useListOrders, useUpdateOrderStatus } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/AdminLayout";

const STATUSES = [
  "pending",
  "accepted",
  "preparing",
  "ready",
  "picked_up",
  "delivered",
  "cancelled",
];

const statusBadge: Record<string, string> = {
  pending: "bg-brand-yellow/30 text-brand-yellow-foreground border-brand-yellow/40",
  accepted: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300",
  preparing: "bg-brand-turquoise-soft text-brand-turquoise border-brand-turquoise/30",
  ready: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300",
  picked_up: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300",
  delivered: "bg-brand-turquoise text-brand-turquoise-foreground border-transparent",
  cancelled: "bg-muted text-muted-foreground border-border",
};

export default function AdminOrdersPage() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: orders, isLoading, refetch } = useListOrders();
  const updateStatus = useUpdateOrderStatus();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const list = [...(orders ?? [])].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return list.filter((o: any) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const customer = o.customerName ?? o.userName ?? "";
      return (
        String(o.id).includes(q) ||
        (o.restaurantName ?? "").toLowerCase().includes(q) ||
        customer.toLowerCase().includes(q)
      );
    });
  }, [orders, search, statusFilter]);

  const handleStatusChange = (id: number, status: string) => {
    updateStatus.mutate(
      { id, data: { status: status as any } },
      {
        onSuccess: () => {
          toast({ title: `Commande #${id} → ${status}` });
          refetch();
        },
        onError: (err: any) =>
          toast({
            title: err?.data?.error || "Erreur",
            variant: "destructive",
          }),
      }
    );
  };

  return (
    <AdminLayout
      title="Commandes"
      subtitle={`${filtered.length} / ${orders?.length ?? 0}`}
      actions={
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </Button>
      }
    >
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ID, restaurant, client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-2xl border border-card-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                  #
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                  Restaurant
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">
                  Client
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                  Total
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">
                  Date
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                  Statut
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    Aucune commande
                  </td>
                </tr>
              ) : (
                filtered.map((order: any) => (
                  <tr
                    key={order.id}
                    className="border-b border-border last:border-0"
                    data-testid={`row-order-${order.id}`}
                  >
                    <td className="px-4 py-3 font-medium">#{order.id}</td>
                    <td className="px-4 py-3">{order.restaurantName}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                      {order.customerName ?? order.userName ?? "—"}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {order.total.toFixed(0)} MAD
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                      {new Date(order.createdAt).toLocaleString("fr-FR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={order.status}
                        onValueChange={(v) => handleStatusChange(order.id, v)}
                      >
                        <SelectTrigger
                          className={`h-8 w-36 text-xs border ${
                            statusBadge[order.status] ?? ""
                          }`}
                          data-testid={`select-status-${order.id}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setLocation(`/orders/${order.id}`)}
                        data-testid={`button-view-order-${order.id}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

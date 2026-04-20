import { useEffect, useMemo, useState } from "react";
import { Search, LifeBuoy, Trash2 } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/AdminLayout";

type Ticket = {
  id: number;
  userId: number;
  category: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "closed";
  createdAt: string;
  userName?: string;
  userEmail?: string;
};

const STATUSES: Ticket["status"][] = ["open", "in_progress", "closed"];

const statusBadge: Record<string, string> = {
  open: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300",
  closed: "bg-muted text-muted-foreground border-border",
};

function apiUrl(path: string) {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
  return `${base}/api${path}`;
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("jatek_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function AdminSupportPage() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(apiUrl("/support-tickets"), { headers: authHeaders() });
      const data = await r.json();
      setTickets(Array.isArray(data) ? data : []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const list = tickets ?? [];
    return list.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (t.subject ?? "").toLowerCase().includes(q) ||
        (t.message ?? "").toLowerCase().includes(q) ||
        (t.category ?? "").toLowerCase().includes(q) ||
        (t.userName ?? "").toLowerCase().includes(q) ||
        (t.userEmail ?? "").toLowerCase().includes(q)
      );
    });
  }, [tickets, search, statusFilter]);

  const counts = useMemo(() => {
    const out = { open: 0, in_progress: 0, closed: 0, total: 0 };
    (tickets ?? []).forEach((t) => {
      out.total += 1;
      if (t.status in out) (out as any)[t.status] += 1;
    });
    return out;
  }, [tickets]);

  const updateStatus = async (id: number, status: string) => {
    setUpdatingId(id);
    try {
      const r = await fetch(apiUrl(`/support-tickets/${id}`), {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || "Erreur");
      }
      toast({ title: `Ticket #${id} → ${status}` });
      load();
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      const r = await fetch(apiUrl(`/support-tickets/${deletingId}`), {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!r.ok) throw new Error("Erreur");
      toast({ title: "Ticket supprimé" });
      setDeletingId(null);
      load();
    } catch {
      toast({ title: "Suppression échouée", variant: "destructive" });
    }
  };

  return (
    <AdminLayout
      title="Support client"
      subtitle={`${counts.total} tickets · ${counts.open} ouverts · ${counts.in_progress} en cours`}
    >
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Sujet, message, client…"
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
            <SelectItem value="all">Tous</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 bg-card rounded-2xl border border-card-border">
            <LifeBuoy className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Aucun ticket trouvé
          </div>
        ) : (
          filtered.map((ticket) => {
            const isOpen = expanded === ticket.id;
            return (
              <div
                key={ticket.id}
                className="bg-card rounded-2xl border border-card-border p-4"
                data-testid={`row-ticket-${ticket.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => setExpanded(isOpen ? null : ticket.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">#{ticket.id}</span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {ticket.category}
                      </Badge>
                      <Badge className={`text-xs border ${statusBadge[ticket.status]}`}>
                        {ticket.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground ms-auto">
                        {new Date(ticket.createdAt).toLocaleString("fr-FR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    <p className="font-semibold mt-1.5">{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ticket.userName ?? `User #${ticket.userId}`}
                      {ticket.userEmail && ` · ${ticket.userEmail}`}
                    </p>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={ticket.status}
                      onValueChange={(v) => updateStatus(ticket.id, v)}
                      disabled={updatingId === ticket.id}
                    >
                      <SelectTrigger className="h-8 w-32 text-xs">
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeletingId(ticket.id)}
                      data-testid={`button-delete-ticket-${ticket.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {isOpen && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-sm whitespace-pre-wrap text-foreground/90">
                      {ticket.message}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce ticket ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le ticket sera supprimé définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

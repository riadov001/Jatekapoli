import { useState, useMemo } from "react";
import { Search, Pencil, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useListUsers, useUpdateUser, useDeleteUser } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/AdminLayout";

const ROLES = ["customer", "driver", "restaurant_owner", "admin"];

const roleColors: Record<string, string> = {
  customer: "bg-muted text-muted-foreground border border-border",
  driver: "bg-accent text-accent-foreground border border-primary/20",
  restaurant_owner: "bg-primary/20 text-primary border border-primary/30",
  admin: "bg-foreground text-background",
};

export default function AdminUsersPage() {
  const { toast } = useToast();
  const { data: users, isLoading, refetch } = useListUsers();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [editing, setEditing] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const list = users ?? [];
    return list.filter((u: any) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (u.name ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.phone ?? "").toLowerCase().includes(q)
      );
    });
  }, [users, search, roleFilter]);

  const toggleActive = (id: number, current: boolean) => {
    updateUser.mutate(
      { id, data: { isActive: !current } },
      {
        onSuccess: () => {
          toast({ title: `Utilisateur ${!current ? "activé" : "désactivé"}` });
          refetch();
        },
        onError: () => toast({ title: "Erreur", variant: "destructive" }),
      }
    );
  };

  const saveEdit = (data: { name: string; phone: string; address: string }) => {
    if (!editing) return;
    updateUser.mutate(
      {
        id: editing.id,
        data: {
          name: data.name,
          phone: data.phone || undefined,
          address: data.address || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Utilisateur mis à jour" });
          setEditing(null);
          refetch();
        },
        onError: (err: any) =>
          toast({
            title: err?.data?.error || "Erreur lors de la sauvegarde",
            variant: "destructive",
          }),
      }
    );
  };

  const confirmDelete = () => {
    if (!deletingId) return;
    deleteUser.mutate(
      { id: deletingId },
      {
        onSuccess: () => {
          toast({ title: "Utilisateur supprimé" });
          setDeletingId(null);
          refetch();
        },
        onError: () =>
          toast({ title: "Suppression échouée", variant: "destructive" }),
      }
    );
  };

  return (
    <AdminLayout
      title="Utilisateurs"
      subtitle={`${filtered.length} / ${users?.length ?? 0}`}
    >
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher nom, email, téléphone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
            data-testid="input-search-users"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les rôles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
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
                  Utilisateur
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                  Rôle
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">
                  Téléphone
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">
                  Points
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
                    <td colSpan={6} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-muted-foreground text-sm"
                  >
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              ) : (
                filtered.map((user: any) => (
                  <tr
                    key={user.id}
                    className="border-b border-border last:border-0"
                    data-testid={`row-user-${user.id}`}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge className={`text-xs border-0 ${roleColors[user.role] || ""}`}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                      {user.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                      {user.loyaltyPoints}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={`text-xs border ${
                          user.isActive
                            ? "bg-primary/15 text-primary border-primary/25"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {user.isActive ? "Actif" : "Inactif"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => toggleActive(user.id, user.isActive)}
                          data-testid={`button-toggle-user-${user.id}`}
                        >
                          {user.isActive ? "Désactiver" : "Activer"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditing(user)}
                          data-testid={`button-edit-user-${user.id}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeletingId(user.id)}
                          data-testid={`button-delete-user-${user.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier l'utilisateur</DialogTitle>
            <DialogDescription>
              Mettez à jour les informations du compte.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                saveEdit({
                  name: String(fd.get("name") || ""),
                  phone: String(fd.get("phone") || ""),
                  address: String(fd.get("address") || ""),
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium mb-1 block">Nom</label>
                <Input name="name" defaultValue={editing.name} required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <Input value={editing.email} disabled />
                <p className="text-xs text-muted-foreground mt-1">Non modifiable</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Téléphone</label>
                <Input name="phone" defaultValue={editing.phone ?? ""} placeholder="+212…" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Adresse</label>
                <Input name="address" defaultValue={editing.address ?? ""} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Rôle</label>
                <Input value={editing.role} disabled />
                <p className="text-xs text-muted-foreground mt-1">
                  Le changement de rôle n'est pas disponible
                </p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={updateUser.isPending}>
                  {updateUser.isPending ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les données liées (commandes,
              avis, adresses) peuvent aussi être affectées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUser.isPending ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

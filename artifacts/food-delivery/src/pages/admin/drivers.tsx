import { useState, useMemo } from "react";
import { Search, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useListDrivers, useUpdateDriver, useDeleteUser } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/AdminLayout";

export default function AdminDriversPage() {
  const { toast } = useToast();
  const { data: drivers, isLoading, refetch } = useListDrivers();
  const updateDriver = useUpdateDriver();
  const deleteUser = useDeleteUser();

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [deletingDriver, setDeletingDriver] = useState<any | null>(null);

  const filtered = useMemo(() => {
    const list = drivers ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (d: any) =>
        (d.userName ?? "").toLowerCase().includes(q) ||
        (d.phone ?? "").toLowerCase().includes(q) ||
        (d.vehicleType ?? "").toLowerCase().includes(q)
    );
  }, [drivers, search]);

  const toggleAvailable = (id: number, current: boolean) => {
    updateDriver.mutate(
      { id, data: { isAvailable: !current } },
      {
        onSuccess: () => {
          toast({ title: "Disponibilité mise à jour" });
          refetch();
        },
      }
    );
  };

  const saveEdit = (data: any) => {
    if (!editing) return;
    updateDriver.mutate(
      {
        id: editing.id,
        data: {
          vehicleType: data.vehicleType,
          isAvailable: data.isAvailable,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Livreur mis à jour" });
          setEditing(null);
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

  const confirmDelete = () => {
    if (!deletingDriver) return;
    // Driver cascades from user → delete the user record
    deleteUser.mutate(
      { id: deletingDriver.userId },
      {
        onSuccess: () => {
          toast({ title: "Livreur supprimé" });
          setDeletingDriver(null);
          refetch();
        },
        onError: () =>
          toast({ title: "Suppression échouée", variant: "destructive" }),
      }
    );
  };

  return (
    <AdminLayout title="Livreurs" subtitle={`${filtered.length} / ${drivers?.length ?? 0}`}>
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher nom, téléphone, véhicule…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      <div className="bg-card rounded-2xl border border-card-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                  Livreur
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                  Véhicule
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">
                  Téléphone
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">
                  Livraisons
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                  Disponible
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    Aucun livreur
                  </td>
                </tr>
              ) : (
                filtered.map((driver: any) => (
                  <tr
                    key={driver.id}
                    className="border-b border-border last:border-0"
                    data-testid={`row-driver-${driver.id}`}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{driver.userName}</p>
                        <p className="text-xs text-muted-foreground">
                          ★ {driver.rating?.toFixed(1) ?? "—"}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground capitalize">
                      {driver.vehicleType ?? "—"}
                      {driver.vehicleNumber && (
                        <span className="block text-xs">{driver.vehicleNumber}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                      {driver.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                      {driver.deliveriesCount ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={driver.isAvailable}
                          onCheckedChange={() => toggleAvailable(driver.id, driver.isAvailable)}
                          data-testid={`switch-available-${driver.id}`}
                        />
                        <Badge
                          className={`text-xs border ${
                            driver.isAvailable
                              ? "bg-primary/15 text-primary border-primary/25"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {driver.isAvailable ? "Dispo" : "Hors ligne"}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditing(driver)}
                          data-testid={`button-edit-driver-${driver.id}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeletingDriver(driver)}
                          data-testid={`button-delete-driver-${driver.id}`}
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

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le livreur</DialogTitle>
            <DialogDescription>{editing?.userName}</DialogDescription>
          </DialogHeader>
          {editing && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                saveEdit({
                  vehicleType: String(fd.get("vehicleType") || editing.vehicleType),
                  isAvailable: fd.get("isAvailable") === "on",
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium mb-1 block">Téléphone</label>
                <Input value={editing.phone ?? "—"} disabled />
                <p className="text-xs text-muted-foreground mt-1">
                  Modifiable depuis la page Utilisateurs
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Type de véhicule</label>
                <select
                  name="vehicleType"
                  defaultValue={editing.vehicleType ?? "moto"}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="moto">Moto</option>
                  <option value="bike">Vélo</option>
                  <option value="scooter">Scooter</option>
                  <option value="car">Voiture</option>
                  <option value="walking">À pied</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="isAvailable"
                  defaultChecked={editing.isAvailable}
                  className="h-4 w-4"
                />
                <label className="text-sm">Disponible</label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={updateDriver.isPending}>
                  {updateDriver.isPending ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingDriver} onOpenChange={(o) => !o && setDeletingDriver(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce livreur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le compte utilisateur associé sera également supprimé. Cette action
              est irréversible.
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

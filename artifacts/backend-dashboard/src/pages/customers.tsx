import { useState } from "react";
import {
  useListBackendCustomers,
  useUpdateUser,
  useDeleteUser,
  getListBackendCustomersQueryKey,
} from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Phone, MapPin, Pencil, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Customers() {
  const [search, setSearch] = useState("");
  const { data: customers, isLoading } = useListBackendCustomers({ search: search || undefined });
  const update = useUpdateUser();
  const del = useDeleteUser();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", isActive: true });

  const invalidate = () => qc.invalidateQueries({ queryKey: getListBackendCustomersQueryKey() });

  const openEdit = (c: any) => {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone ?? "", address: c.address ?? "", isActive: c.isActive });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    update.mutate({ id: editing.id, data: form as any }, {
      onSuccess: () => { invalidate(); setEditing(null); toast({ title: "Modifié" }); },
      onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Supprimer ce client ? Cette action est irréversible.")) return;
    del.mutate({ id }, { onSuccess: () => { invalidate(); toast({ title: "Supprimé" }); } });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="hidden md:table-cell">Contact</TableHead>
                <TableHead className="hidden sm:table-cell">Points</TableHead>
                <TableHead className="hidden md:table-cell">Inscrit</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-8 w-32" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              )) : customers?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Aucun client.</TableCell></TableRow>
              ) : customers?.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">{c.name.charAt(0).toUpperCase()}</div>
                      <div><div className="font-bold">{c.name}</div><div className="text-xs text-muted-foreground">{c.email}</div></div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="space-y-1">
                      {c.phone && <div className="text-xs text-muted-foreground flex items-center"><Phone className="h-3 w-3 mr-1" /> {c.phone}</div>}
                      {c.address && <div className="text-xs text-muted-foreground flex items-center"><MapPin className="h-3 w-3 mr-1" /> <span className="truncate max-w-[150px]">{c.address}</span></div>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell font-medium text-primary">{c.loyaltyPoints} pts</TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{format(new Date(c.createdAt), "dd MMM yyyy")}</TableCell>
                  <TableCell><Badge variant={c.isActive ? "default" : "secondary"}>{c.isActive ? "Actif" : "Inactif"}</Badge></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier {editing?.name}</DialogTitle></DialogHeader>
          {editing && (
            <form onSubmit={handleSave} className="space-y-3 pt-4">
              <div className="space-y-1"><Label className="text-xs">Nom</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Adresse</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div className="flex items-center gap-2 pt-2"><Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} /><Label>Compte actif</Label></div>
              <DialogFooter className="pt-4"><Button type="submit" disabled={update.isPending}>{update.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Enregistrer</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

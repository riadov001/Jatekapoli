import { useState } from "react";
import {
  useListBackendProducts,
  useListBackendShops,
  useCreateMenuItem,
  useUpdateMenuItem,
  useDeleteMenuItem,
  getListBackendProductsQueryKey,
} from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";

const EMPTY = { name: "", description: "", price: "", category: "", imageUrl: "", isAvailable: true, isPopular: false };

export default function Products() {
  const [search, setSearch] = useState("");
  const { data: products, isLoading } = useListBackendProducts({ search: search || undefined });
  const { data: shops } = useListBackendShops({});
  const create = useCreateMenuItem();
  const update = useUpdateMenuItem();
  const del = useDeleteMenuItem();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [shopId, setShopId] = useState<string>("");
  const [form, setForm] = useState(EMPTY);

  const [editing, setEditing] = useState<any | null>(null);
  const [editForm, setEditForm] = useState(EMPTY);

  const invalidate = () => qc.invalidateQueries({ queryKey: getListBackendProductsQueryKey() });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) { toast({ title: "Choisissez une boutique", variant: "destructive" }); return; }
    create.mutate({
      restaurantId: Number(shopId),
      data: {
        name: form.name, description: form.description || undefined,
        price: Number(form.price), category: form.category,
        imageUrl: form.imageUrl || undefined,
        isAvailable: form.isAvailable, isPopular: form.isPopular,
      } as any,
    }, {
      onSuccess: () => { invalidate(); setCreateOpen(false); setForm(EMPTY); setShopId(""); toast({ title: "Produit créé" }); },
      onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
    });
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setEditForm({
      name: p.name, description: p.description ?? "", price: String(p.price),
      category: p.category, imageUrl: p.imageUrl ?? "",
      isAvailable: p.isAvailable, isPopular: p.isPopular,
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    update.mutate({ id: editing.id, data: {
      name: editForm.name, description: editForm.description || undefined,
      price: Number(editForm.price), category: editForm.category,
      imageUrl: editForm.imageUrl || undefined,
      isAvailable: editForm.isAvailable, isPopular: editForm.isPopular,
    } as any }, {
      onSuccess: () => { invalidate(); setEditing(null); toast({ title: "Modifié" }); },
      onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
    });
  };

  const handleToggle = (p: any, isAvailable: boolean) => {
    update.mutate({ id: p.id, data: { isAvailable } }, { onSuccess: invalidate });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Supprimer ce produit ?")) return;
    del.mutate({ id }, { onSuccess: () => { invalidate(); toast({ title: "Supprimé" }); } });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Produits</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Nouveau produit</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Créer un produit</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3 pt-4">
              <Field label="Boutique">
                <Select value={shopId} onValueChange={setShopId}>
                  <SelectTrigger><SelectValue placeholder="Choisir une boutique" /></SelectTrigger>
                  <SelectContent>{shops?.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <ProductFields form={form} setForm={setForm} />
              <DialogFooter className="pt-4"><Button type="submit" disabled={create.isPending}>{create.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Créer</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Disponible</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell><Skeleton className="h-4 w-32" /></TableCell><TableCell><Skeleton className="h-4 w-20" /></TableCell><TableCell><Skeleton className="h-4 w-16" /></TableCell><TableCell><Skeleton className="h-6 w-12" /></TableCell><TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell></TableRow>
              )) : products?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Aucun produit.</TableCell></TableRow>
              ) : products?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-3">
                      {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="h-10 w-10 rounded-md object-cover" /> : <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center"><span className="text-xs text-muted-foreground">—</span></div>}
                      <span>{p.name}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{p.category}</Badge></TableCell>
                  <TableCell className="font-semibold">{p.price} DH</TableCell>
                  <TableCell><Switch checked={p.isAvailable} onCheckedChange={(v) => handleToggle(p, v)} /></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Modifier {editing?.name}</DialogTitle></DialogHeader>
          {editing && (
            <form onSubmit={handleUpdate} className="space-y-3 pt-4">
              <ProductFields form={editForm} setForm={setEditForm} />
              <DialogFooter className="pt-4"><Button type="submit" disabled={update.isPending}>{update.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Enregistrer</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductFields({ form, setForm }: any) {
  const set = (k: string, v: any) => setForm({ ...form, [k]: v });
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nom"><Input required value={form.name} onChange={(e: any) => set("name", e.target.value)} /></Field>
        <Field label="Catégorie"><Input required value={form.category} onChange={(e: any) => set("category", e.target.value)} /></Field>
        <Field label="Prix (DH)"><Input required type="number" step="0.01" value={form.price} onChange={(e: any) => set("price", e.target.value)} /></Field>
        <Field label="Image (URL)"><Input value={form.imageUrl} onChange={(e: any) => set("imageUrl", e.target.value)} /></Field>
      </div>
      <Field label="Description"><Textarea rows={2} value={form.description} onChange={(e: any) => set("description", e.target.value)} /></Field>
      <div className="flex items-center gap-6 pt-2">
        <label className="flex items-center gap-2 text-sm"><Switch checked={form.isAvailable} onCheckedChange={(v: any) => set("isAvailable", v)} /> Disponible</label>
        <label className="flex items-center gap-2 text-sm"><Switch checked={form.isPopular} onCheckedChange={(v: any) => set("isPopular", v)} /> Populaire</label>
      </div>
    </>
  );
}

function Field({ label, children }: any) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListBackendCategoriesAll,
  useCreateBackendCategory,
  useUpdateBackendCategory,
  useDeleteBackendCategory,
  getListBackendCategoriesAllQueryKey,
  CategoryWithSubs,
  CategoryBody,
} from "@workspace/api-client-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tags, Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const EMPTY_FORM: CategoryBody = {
  name: "",
  slug: "",
  icon: "storefront",
  accentColor: "#E91E63",
  parentId: null,
  businessType: "restaurant",
  isActive: true,
  sortOrder: 0,
};

function toSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

interface FormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: CategoryBody & { id?: number };
  parents: CategoryWithSubs[];
  onSave: (data: CategoryBody, id?: number) => void;
  loading: boolean;
}

function CategoryFormDialog({ open, onOpenChange, initial, parents, onSave, loading }: FormDialogProps) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState<CategoryBody>(initial ?? EMPTY_FORM);

  const set = (k: keyof CategoryBody) => (v: any) =>
    setForm((p) => ({
      ...p,
      [k]: v,
      ...(k === "name" && !isEdit ? { slug: toSlug(v) } : {}),
    }));

  const handleOpen = (v: boolean) => {
    if (v) setForm(initial ?? EMPTY_FORM);
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier la catégorie" : "Nouvelle catégorie"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-1.5">
            <Label>Nom *</Label>
            <Input value={form.name} onChange={(e) => set("name")(e.target.value)} placeholder="ex: Restauration" />
          </div>
          <div className="grid gap-1.5">
            <Label>Slug *</Label>
            <Input value={form.slug} onChange={(e) => set("slug")(e.target.value)} placeholder="ex: restauration" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Icône</Label>
              <Input value={form.icon ?? ""} onChange={(e) => set("icon")(e.target.value)} placeholder="storefront" />
            </div>
            <div className="grid gap-1.5">
              <Label>Couleur</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.accentColor ?? "#E91E63"}
                  onChange={(e) => set("accentColor")(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border p-0.5"
                />
                <Input value={form.accentColor ?? ""} onChange={(e) => set("accentColor")(e.target.value)} className="flex-1" />
              </div>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Catégorie parente (optionnel)</Label>
            <select
              value={form.parentId ?? ""}
              onChange={(e) => set("parentId")(e.target.value ? Number(e.target.value) : null)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">— Aucune (catégorie principale) —</option>
              {parents.filter((p) => p.id !== initial?.id).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label>Type de business</Label>
            <select
              value={form.businessType ?? "restaurant"}
              onChange={(e) => set("businessType")(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="restaurant">Restaurant</option>
              <option value="shop">Boutique / Épicerie</option>
              <option value="pharmacy">Pharmacie</option>
              <option value="courier">Coursier</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Switch checked={form.isActive !== false} onCheckedChange={(v) => set("isActive")(v)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Ordre d'affichage</Label>
            <Input
              type="number"
              value={form.sortOrder ?? 0}
              onChange={(e) => set("sortOrder")(Number(e.target.value))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => onSave(form, initial?.id)} disabled={loading || !form.name || !form.slug}>
            {loading ? "Enregistrement..." : isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Categories() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: categories, isLoading } = useListBackendCategoriesAll();
  const createCat = useCreateBackendCategory();
  const updateCat = useUpdateBackendCategory();
  const deleteCat = useDeleteBackendCategory();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<(CategoryBody & { id: number }) | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const invalidate = () => qc.invalidateQueries({ queryKey: getListBackendCategoriesAllQueryKey() });

  const handleSave = (data: CategoryBody, id?: number) => {
    if (id) {
      updateCat.mutate({ id, data }, {
        onSuccess: () => { invalidate(); setDialogOpen(false); toast({ title: "Catégorie mise à jour" }); },
        onError: () => toast({ title: "Erreur", variant: "destructive" }),
      });
    } else {
      createCat.mutate({ data }, {
        onSuccess: () => { invalidate(); setDialogOpen(false); toast({ title: "Catégorie créée" }); },
        onError: () => toast({ title: "Erreur", variant: "destructive" }),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteCat.mutate({ id: deleteId }, {
      onSuccess: () => { invalidate(); setDeleteId(null); toast({ title: "Catégorie supprimée" }); },
      onError: () => toast({ title: "Erreur", variant: "destructive" }),
    });
  };

  const openCreate = () => { setEditItem(null); setDialogOpen(true); };
  const openEdit = (cat: CategoryWithSubs) => {
    setEditItem({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon,
      accentColor: cat.accentColor,
      parentId: cat.parentId ?? null,
      businessType: cat.businessType,
      isActive: cat.isActive,
      sortOrder: cat.sortOrder,
    });
    setDialogOpen(true);
  };

  const toggleExpand = (id: number) => setExpanded((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const parents = categories ?? [];
  const isMutating = createCat.isPending || updateCat.isPending;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tags className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Catégories</h1>
            <p className="text-muted-foreground text-sm">Gérer les catégories et sous-catégories de la plateforme</p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle catégorie
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Tags className="h-4 w-4 text-primary" />
            Catégories ({categories?.length ?? 0} principale{(categories?.length ?? 0) !== 1 ? "s" : ""})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Nom</TableHead>
                <TableHead className="hidden sm:table-cell">Slug</TableHead>
                <TableHead className="hidden md:table-cell">Couleur</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (categories?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Aucune catégorie. Créez la première !
                  </TableCell>
                </TableRow>
              ) : (
                parents.map((cat) => (
                  <>
                    <TableRow key={cat.id} className="group">
                      <TableCell className="pr-0">
                        {(cat.subCategories?.length ?? 0) > 0 && (
                          <button
                            onClick={() => toggleExpand(cat.id)}
                            className="p-0.5 text-muted-foreground hover:text-foreground"
                          >
                            {expanded.has(cat.id)
                              ? <ChevronDown className="h-4 w-4" />
                              : <ChevronRight className="h-4 w-4" />
                            }
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-base shrink-0"
                            style={{ background: cat.accentColor + "22" }}
                          >
                            {cat.icon?.length === 1 || cat.icon?.includes("_") ? "🏪" : cat.icon ?? "🏪"}
                          </span>
                          <span className="font-medium">{cat.name}</span>
                          {(cat.subCategories?.length ?? 0) > 0 && (
                            <Badge variant="outline" className="text-xs">{cat.subCategories!.length} sous-cat.</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-xs font-mono">{cat.slug}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full border" style={{ background: cat.accentColor }} />
                          <span className="text-xs text-muted-foreground">{cat.accentColor}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="secondary" className="text-xs">{cat.businessType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={cat.isActive ? "default" : "outline"} className="text-xs">
                          {cat.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(cat)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(cat.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {expanded.has(cat.id) && cat.subCategories?.map((sub) => (
                      <TableRow key={`sub-${sub.id}`} className="bg-muted/20">
                        <TableCell />
                        <TableCell>
                          <div className="flex items-center gap-2 pl-5">
                            <span className="w-1 h-4 bg-border rounded-full" />
                            <span className="text-sm">{sub.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-xs font-mono">{sub.slug}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full border" style={{ background: sub.accentColor }} />
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="secondary" className="text-xs">{sub.businessType}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={sub.isActive ? "default" : "outline"} className="text-xs">
                            {sub.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(sub as any)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(sub.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CategoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editItem ?? undefined}
        parents={parents}
        onSave={handleSave}
        loading={isMutating}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la catégorie ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les sous-catégories orphelines resteront en base.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteCat.isPending ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

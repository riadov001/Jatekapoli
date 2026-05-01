import { useState } from "react";
import { useListBackendCategories, getListBackendCategoriesQueryKey } from "@workspace/api-client-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tags, Pencil, Trash2, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";

type Category = { id: number; name: string; slug: string; icon: string; accentColor: string; isActive: boolean; count: number };

export default function Categories() {
  const { data: categories, isLoading } = useListBackendCategories();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [creating, setCreating] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("storefront");
  const [newCatColor, setNewCatColor] = useState("#E91E63");

  const [renaming, setRenaming] = useState<Category | null>(null);
  const [newName, setNewName] = useState("");
  const [deleting, setDeleting] = useState<Category | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: getListBackendCategoriesQueryKey() });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/backend/categories", {
        method: "POST",
        body: JSON.stringify({ name: newCatName.trim(), icon: newCatIcon.trim(), accentColor: newCatColor }),
      }),
    onSuccess: () => {
      invalidate();
      setCreating(false);
      setNewCatName("");
      setNewCatIcon("storefront");
      setNewCatColor("#E91E63");
      toast({ title: "Catégorie créée" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const renameMutation = useMutation({
    mutationFn: (vars: { oldName: string; newName: string }) =>
      apiFetch(`/api/backend/categories/${encodeURIComponent(vars.oldName)}`, {
        method: "PATCH",
        body: JSON.stringify({ name: vars.newName }),
      }),
    onSuccess: () => { invalidate(); setRenaming(null); toast({ title: "Catégorie renommée" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) =>
      apiFetch(`/api/backend/categories/${encodeURIComponent(name)}`, { method: "DELETE" }),
    onSuccess: () => { invalidate(); setDeleting(null); toast({ title: "Catégorie supprimée" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const openRename = (cat: Category) => { setRenaming(cat); setNewName(cat.name); };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Catégories</h1>
        <Button onClick={() => setCreating(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle catégorie
        </Button>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Tags className="h-5 w-5 text-primary" />
            <span>Catégories de boutiques</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom de la catégorie</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-right">Boutiques</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : (categories as Category[] | undefined)?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Aucune catégorie trouvée.
                  </TableCell>
                </TableRow>
              ) : (
                (categories as Category[] | undefined)?.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{cat.slug}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="px-2 py-1">
                        {cat.count} boutique{cat.count !== 1 ? "s" : ""}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openRename(cat)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleting(cat)}
                          disabled={cat.count > 0}
                          title={cat.count > 0 ? "Réaffectez les boutiques d'abord" : "Supprimer"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={creating} onOpenChange={(o) => !o && setCreating(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle catégorie</DialogTitle>
            <DialogDescription>
              Créez une nouvelle catégorie de boutiques visible dans l'application.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); if (newCatName.trim()) createMutation.mutate(); }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1">
              <Label className="text-xs">Nom *</Label>
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Ex: Sushi, Épicerie…"
                required
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Icône (Material icon name)</Label>
              <Input
                value={newCatIcon}
                onChange={(e) => setNewCatIcon(e.target.value)}
                placeholder="storefront"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Couleur d'accent</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newCatColor}
                  onChange={(e) => setNewCatColor(e.target.value)}
                  className="h-9 w-12 rounded border cursor-pointer"
                />
                <Input
                  value={newCatColor}
                  onChange={(e) => setNewCatColor(e.target.value)}
                  placeholder="#E91E63"
                  className="flex-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreating(false)}>Annuler</Button>
              <Button type="submit" disabled={createMutation.isPending || !newCatName.trim()}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Créer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renommer la catégorie</DialogTitle>
            <DialogDescription>
              Ce changement sera appliqué à toutes les boutiques de la catégorie «{renaming?.name}».
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); if (renaming && newName.trim()) renameMutation.mutate({ oldName: renaming.name, newName: newName.trim() }); }} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Nouveau nom</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nom de la catégorie" required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenaming(null)}>Annuler</Button>
              <Button type="submit" disabled={renameMutation.isPending || !newName.trim() || newName.trim() === renaming?.name}>
                {renameMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Renommer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer «{deleting?.name}» ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette catégorie sera supprimée définitivement. Elle ne contient aucune boutique.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleting && deleteMutation.mutate(deleting.name)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState } from "react";
import {
  useListBackendAds,
  useCreateBackendAd,
  useUpdateBackendAd,
  useDeleteBackendAd,
  getListBackendAdsQueryKey,
  type Ad,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Tags, ToggleLeft, ToggleRight } from "lucide-react";

type AdType = "jatek_offer" | "vip_banner" | "promo_banner";

const AD_TYPE_LABELS: Record<AdType, string> = {
  jatek_offer: "Offre Jatek",
  vip_banner: "Bannière VIP",
  promo_banner: "Bannière Promo",
};

interface AdForm {
  type: AdType;
  title: string;
  subtitle: string;
  badge: string;
  bgColor: string;
  accentColor: string;
  icon: string;
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
  sortOrder: number;
}

const EMPTY: AdForm = {
  type: "vip_banner",
  title: "",
  subtitle: "",
  badge: "",
  bgColor: "#E91E63",
  accentColor: "",
  icon: "star",
  imageUrl: "",
  linkUrl: "",
  isActive: true,
  sortOrder: 0,
};

export default function AdminPromotionsPage() {
  const { data: ads, isLoading } = useListBackendAds({});
  const createAd = useCreateBackendAd();
  const updateAd = useUpdateBackendAd();
  const deleteAd = useDeleteBackendAd();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<AdForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: getListBackendAdsQueryKey() });

  const openCreate = () => { setEditId(null); setForm(EMPTY); setOpen(true); };

  const openEdit = (ad: Ad) => {
    setEditId(ad.id);
    setForm({
      type: (ad.type as AdType) ?? "vip_banner",
      title: ad.title ?? "",
      subtitle: (ad as any).subtitle ?? "",
      badge: (ad as any).badge ?? "",
      bgColor: (ad as any).bgColor ?? "#E91E63",
      accentColor: (ad as any).accentColor ?? "",
      icon: (ad as any).icon ?? "star",
      imageUrl: (ad as any).imageUrl ?? "",
      linkUrl: (ad as any).linkUrl ?? "",
      isActive: ad.isActive ?? true,
      sortOrder: ad.sortOrder ?? 0,
    });
    setOpen(true);
  };

  const field = (k: keyof AdForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: "Titre requis", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      type: form.type,
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || undefined,
      badge: form.badge.trim() || undefined,
      bgColor: form.bgColor,
      accentColor: form.accentColor.trim() || undefined,
      icon: form.icon.trim() || "star",
      imageUrl: form.imageUrl.trim() || undefined,
      linkUrl: form.linkUrl.trim() || undefined,
      isActive: form.isActive,
      sortOrder: Number(form.sortOrder),
    };
    try {
      if (editId) {
        await updateAd.mutateAsync({ id: editId, data: payload });
        toast({ title: "Publicité mise à jour" });
      } else {
        await createAd.mutateAsync({ data: payload });
        toast({ title: "Publicité créée" });
      }
      invalidate();
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Supprimer cette publicité ?")) return;
    deleteAd.mutate({ id }, {
      onSuccess: () => { invalidate(); toast({ title: "Supprimée" }); },
      onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
    });
  };

  const toggleActive = async (ad: Ad) => {
    try {
      await updateAd.mutateAsync({ id: ad.id, data: { isActive: !ad.isActive } });
      invalidate();
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <AdminLayout
      title="Promotions"
      subtitle="Gestion des publicités et bannières affichées dans l'application"
      actions={
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Nouvelle publicité
        </Button>
      }
    >
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Tags className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">
            Publicités ({isLoading ? "…" : (ads?.length ?? 0)})
          </span>
        </div>

        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-5 w-20 ml-auto" />
              </div>
            ))}
          </div>
        ) : ads?.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            Aucune publicité. Créez-en une pour commencer.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {ads?.map((ad) => (
              <div key={ad.id} className="flex items-center gap-4 px-5 py-3.5">
                <div
                  className="h-8 w-8 rounded-full shrink-0 border border-border/60"
                  style={{ background: (ad as any).bgColor ?? "#E91E63" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{ad.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {AD_TYPE_LABELS[(ad.type as AdType)] ?? ad.type}
                    {(ad as any).badge ? ` · ${(ad as any).badge}` : ""}
                    {" · Ordre "}{ad.sortOrder}
                  </p>
                </div>
                <Badge variant={ad.isActive ? "default" : "secondary"} className="shrink-0">
                  {ad.isActive ? "Actif" : "Inactif"}
                </Badge>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleActive(ad)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title={ad.isActive ? "Désactiver" : "Activer"}
                  >
                    {ad.isActive
                      ? <ToggleRight className="h-4 w-4 text-primary" />
                      : <ToggleLeft className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => openEdit(ad)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(ad.id)}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Modifier la publicité" : "Nouvelle publicité"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Type *</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((p) => ({ ...p, type: v as AdType }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(AD_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Titre *</Label>
              <Input value={form.title} onChange={field("title")} placeholder="Ex: Livraison gratuite" />
            </div>
            <div className="grid gap-1.5">
              <Label>Sous-titre</Label>
              <Input value={form.subtitle} onChange={field("subtitle")} placeholder="Ex: Sur votre première commande" />
            </div>
            <div className="grid gap-1.5">
              <Label>Badge</Label>
              <Input value={form.badge} onChange={field("badge")} placeholder="Ex: NEW, -20%" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Couleur de fond</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={form.bgColor}
                    onChange={(e) => setForm((p) => ({ ...p, bgColor: e.target.value }))}
                    className="h-9 w-10 rounded border cursor-pointer p-0.5"
                  />
                  <Input value={form.bgColor} onChange={field("bgColor")} className="flex-1 font-mono text-sm" />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>Couleur accent</Label>
                <Input value={form.accentColor} onChange={field("accentColor")} placeholder="#ffffff" className="font-mono text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Icône</Label>
                <Input value={form.icon} onChange={field("icon")} placeholder="star, zap, gift…" />
              </div>
              <div className="grid gap-1.5">
                <Label>Ordre d'affichage</Label>
                <Input type="number" value={String(form.sortOrder)} onChange={field("sortOrder")} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>URL image (optionnel)</Label>
              <Input value={form.imageUrl} onChange={field("imageUrl")} placeholder="https://…" />
            </div>
            <div className="grid gap-1.5">
              <Label>URL de destination (optionnel)</Label>
              <Input value={form.linkUrl} onChange={field("linkUrl")} placeholder="/restaurant/42" />
            </div>
            <div className="flex items-center gap-3 py-1">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
              />
              <Label className="cursor-pointer">Actif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

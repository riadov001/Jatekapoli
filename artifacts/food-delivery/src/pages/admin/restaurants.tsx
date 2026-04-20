import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Award, Plus, Pencil, Trash2, Upload, UtensilsCrossed } from "lucide-react";
import { useUpload } from "@workspace/object-storage-web";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  useListRestaurants, useUpdateRestaurant, useCreateRestaurant, useDeleteRestaurant,
} from "@workspace/api-client-react";
import type { Restaurant } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const BUSINESS_TYPES = ["restaurant", "grocery", "pharmacy", "bakery"];

type FormState = {
  name: string;
  category: string;
  businessType: string;
  address: string;
  phone: string;
  imageUrl: string;
  deliveryTime: string;
  deliveryFee: string;
  minimumOrder: string;
};

const emptyForm: FormState = {
  name: "",
  category: "",
  businessType: "restaurant",
  address: "",
  phone: "",
  imageUrl: "",
  deliveryTime: "",
  deliveryFee: "",
  minimumOrder: "",
};

export default function AdminRestaurantsPage() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: restaurants, isLoading, refetch } = useListRestaurants();
  const updateRestaurant = useUpdateRestaurant();
  const createRestaurant = useCreateRestaurant();
  const deleteRestaurant = useDeleteRestaurant();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Restaurant | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const { uploadFile, isUploading } = useUpload({
    getRequestHeaders: () => {
      const token = localStorage.getItem("jatek_token");
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      return headers;
    },
    onSuccess: (resp) => {
      setForm((f) => ({ ...f, imageUrl: `/api/storage${resp.objectPath}` }));
      toast({ title: "Image uploaded" });
    },
    onError: (err) => toast({ title: "Upload failed", description: err.message, variant: "destructive" }),
  });

  const handlePickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (r: Restaurant) => {
    setEditing(r);
    setForm({
      name: r.name,
      category: r.category,
      businessType: r.businessType,
      address: r.address,
      phone: r.phone ?? "",
      imageUrl: r.imageUrl ?? "",
      deliveryTime: r.deliveryTime != null ? String(r.deliveryTime) : "",
      deliveryFee: r.deliveryFee != null ? String(r.deliveryFee) : "",
      minimumOrder: r.minimumOrder != null ? String(r.minimumOrder) : "",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.category.trim() || !form.address.trim()) {
      toast({ title: "Name, category and address are required", variant: "destructive" });
      return;
    }
    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      businessType: form.businessType,
      address: form.address.trim(),
      phone: form.phone.trim() || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
      deliveryTime: form.deliveryTime ? parseInt(form.deliveryTime, 10) : undefined,
      deliveryFee: form.deliveryFee ? parseFloat(form.deliveryFee) : undefined,
      minimumOrder: form.minimumOrder ? parseFloat(form.minimumOrder) : undefined,
    };

    if (editing) {
      updateRestaurant.mutate({ id: editing.id, data: payload }, {
        onSuccess: () => {
          toast({ title: "Restaurant updated" });
          refetch();
          setDialogOpen(false);
        },
        onError: () => toast({ title: "Failed to update restaurant", variant: "destructive" }),
      });
    } else {
      createRestaurant.mutate({ data: payload }, {
        onSuccess: () => {
          toast({ title: "Restaurant created" });
          refetch();
          setDialogOpen(false);
        },
        onError: () => toast({ title: "Failed to create restaurant", variant: "destructive" }),
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteRestaurant.mutate({ id }, {
      onSuccess: () => { toast({ title: "Restaurant deleted" }); refetch(); },
      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
    });
  };

  const toggleOpen = (id: number, current: boolean) => {
    updateRestaurant.mutate({ id, data: { isOpen: !current } }, {
      onSuccess: () => { toast({ title: "Status updated" }); refetch(); },
    });
  };

  const toggleLocal = (id: number, current: boolean) => {
    updateRestaurant.mutate({ id, data: { isLocal: !current } }, {
      onSuccess: () => { toast({ title: "Local badge updated" }); refetch(); },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/dashboard")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-display font-bold text-xl">Manage Restaurants</h1>
            <p className="text-muted-foreground text-sm">{restaurants?.length ?? 0} restaurants</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 shrink-0" onClick={openCreate} data-testid="button-add-restaurant">
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Restaurant" : "Add Restaurant"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" data-testid="input-restaurant-name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Moroccan" className="mt-1" data-testid="input-restaurant-category" />
                </div>
                <div>
                  <Label>Business Type</Label>
                  <Select value={form.businessType} onValueChange={(v) => setForm({ ...form, businessType: v })}>
                    <SelectTrigger className="mt-1" data-testid="select-business-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Delivery time (min)</Label>
                  <Input type="number" value={form.deliveryTime} onChange={(e) => setForm({ ...form, deliveryTime: e.target.value })} className="mt-1" data-testid="input-delivery-time" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Delivery fee (MAD)</Label>
                  <Input type="number" value={form.deliveryFee} onChange={(e) => setForm({ ...form, deliveryFee: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Min. order (MAD)</Label>
                  <Input type="number" value={form.minimumOrder} onChange={(e) => setForm({ ...form, minimumOrder: e.target.value })} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Image</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    asChild
                    disabled={isUploading}
                    className="gap-2"
                    data-testid="button-upload-restaurant-image"
                  >
                    <label className="cursor-pointer">
                      <Upload className="w-4 h-4" />
                      {isUploading ? "Uploading..." : "Upload image"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePickImage}
                        disabled={isUploading}
                      />
                    </label>
                  </Button>
                  {form.imageUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setForm({ ...form, imageUrl: "" })}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <Input
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="…or paste an image URL"
                  className="mt-2"
                  data-testid="input-image-url"
                />
                {form.imageUrl && (
                  <img src={form.imageUrl} alt="" className="mt-2 w-full h-32 object-cover rounded-lg border" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={createRestaurant.isPending || updateRestaurant.isPending} data-testid="button-save-restaurant">
                {createRestaurant.isPending || updateRestaurant.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : (restaurants ?? []).map((r) => (
          <div key={r.id} className="bg-card rounded-2xl border border-card-border p-4 flex items-center gap-4" data-testid={`row-restaurant-${r.id}`}>
            {r.imageUrl ? (
              <img src={r.imageUrl} alt={r.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-muted shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-semibold text-sm truncate">{r.name}</p>
                {r.isLocal && <Award className="w-3.5 h-3.5 text-primary shrink-0" />}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {r.category} • {r.businessType} • {r.deliveryTime ?? "—"} min
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground">Local</span>
                <Switch checked={r.isLocal} onCheckedChange={() => toggleLocal(r.id, r.isLocal)} data-testid={`switch-local-${r.id}`} />
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground">Open</span>
                <Switch checked={r.isOpen} onCheckedChange={() => toggleOpen(r.id, r.isOpen)} data-testid={`switch-open-${r.id}`} />
              </div>
              <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setLocation(`/admin/restaurants/${r.id}/menu`)} title="Manage menu">
                <UtensilsCrossed className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => openEdit(r)} data-testid={`button-edit-${r.id}`}>
                <Pencil className="w-4 h-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive" data-testid={`button-delete-${r.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {r.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove the restaurant and may affect related orders. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(r.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

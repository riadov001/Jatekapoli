import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Plus, Pencil, Trash2, Upload } from "lucide-react";
import { useUpload } from "@workspace/object-storage-web";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  useGetRestaurant, useListMenuItems, useCreateMenuItem, useUpdateMenuItem, useDeleteMenuItem,
} from "@workspace/api-client-react";
import type { MenuItem } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

type FormState = {
  name: string;
  description: string;
  price: string;
  category: string;
  imageUrl: string;
  isAvailable: boolean;
};

const emptyForm: FormState = {
  name: "",
  description: "",
  price: "",
  category: "",
  imageUrl: "",
  isAvailable: true,
};

export default function AdminRestaurantMenuPage() {
  const params = useParams<{ id: string }>();
  const restaurantId = parseInt(params.id ?? "0", 10);
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: restaurant } = useGetRestaurant(restaurantId);
  const { data: items, isLoading, refetch } = useListMenuItems(restaurantId, undefined);

  const createItem = useCreateMenuItem();
  const updateItem = useUpdateMenuItem();
  const deleteItem = useDeleteMenuItem();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
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

  const openEdit = (item: MenuItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description ?? "",
      price: String(item.price),
      category: item.category,
      imageUrl: item.imageUrl ?? "",
      isAvailable: item.isAvailable,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.category.trim() || !form.price) {
      toast({ title: "Name, price and category are required", variant: "destructive" });
      return;
    }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: parseFloat(form.price),
      category: form.category.trim(),
      imageUrl: form.imageUrl.trim() || undefined,
    };

    const fullPayload = { ...payload, isAvailable: form.isAvailable };

    if (editing) {
      updateItem.mutate(
        { id: editing.id, data: fullPayload },
        {
          onSuccess: () => { toast({ title: "Item updated" }); refetch(); setDialogOpen(false); },
          onError: () => toast({ title: "Failed to update", variant: "destructive" }),
        }
      );
    } else {
      createItem.mutate(
        { restaurantId, data: fullPayload },
        {
          onSuccess: () => { toast({ title: "Item created" }); refetch(); setDialogOpen(false); },
          onError: () => toast({ title: "Failed to create", variant: "destructive" }),
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    deleteItem.mutate({ id }, {
      onSuccess: () => { toast({ title: "Item deleted" }); refetch(); },
      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
    });
  };

  const toggleAvailable = (item: MenuItem) => {
    updateItem.mutate(
      { id: item.id, data: { isAvailable: !item.isAvailable } },
      { onSuccess: () => refetch() }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/restaurants")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-display font-bold text-xl truncate">
              Menu — {restaurant?.name ?? "…"}
            </h1>
            <p className="text-muted-foreground text-sm">{items?.length ?? 0} items</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 shrink-0" onClick={openCreate} data-testid="button-add-menu-item">
              <Plus className="w-4 h-4" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" data-testid="input-menu-name" />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Price (MAD)</Label>
                  <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1" data-testid="input-menu-price" />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Mains" className="mt-1" data-testid="input-menu-category" />
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
                    data-testid="button-upload-menu-image"
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
                />
                {form.imageUrl && (
                  <img src={form.imageUrl} alt="" className="mt-2 w-full h-24 object-cover rounded-lg border" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.isAvailable} onCheckedChange={(v) => setForm({ ...form, isAvailable: v })} data-testid="switch-menu-available" />
                <Label>Available</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={createItem.isPending || updateItem.isPending} data-testid="button-save-menu-item">
                {createItem.isPending || updateItem.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
        ) : (items ?? []).length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-2xl">
            <p>No menu items yet. Add the first one!</p>
          </div>
        ) : (items ?? []).map((item) => (
          <div key={item.id} className="bg-card rounded-xl border border-card-border p-4 flex items-center gap-3" data-testid={`row-menu-item-${item.id}`}>
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-muted shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm truncate">{item.name}</p>
                <Badge variant="secondary" className="text-xs shrink-0">{item.category}</Badge>
              </div>
              <p className="text-sm text-primary font-bold">{item.price} MAD</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Switch checked={item.isAvailable} onCheckedChange={() => toggleAvailable(item)} data-testid={`switch-available-${item.id}`} />
              <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => openEdit(item)} data-testid={`button-edit-${item.id}`}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive" data-testid={`button-delete-${item.id}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {item.name}?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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

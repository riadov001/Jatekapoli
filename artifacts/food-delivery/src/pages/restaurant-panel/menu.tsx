import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  useListRestaurants, useListMenuItems, useCreateMenuItem, useUpdateMenuItem, useDeleteMenuItem,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function RestaurantMenuPage() {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", price: "", category: "", isAvailable: true });

  const { data: restaurants } = useListRestaurants({ ownerId: user?.id });
  const myRestaurant = restaurants?.[0];

  const { data: menuItems, isLoading, refetch } = useListMenuItems(
    myRestaurant?.id ?? 0, undefined,
    { query: { enabled: !!myRestaurant } }
  );

  const createItem = useCreateMenuItem();
  const updateItem = useUpdateMenuItem();
  const deleteItem = useDeleteMenuItem();

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: "", description: "", price: "", category: "", isAvailable: true });
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ name: item.name, description: item.description || "", price: String(item.price), category: item.category, isAvailable: item.isAvailable });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!myRestaurant) return;
    const data = { name: form.name, description: form.description, price: parseFloat(form.price), category: form.category, isAvailable: form.isAvailable };

    if (editItem) {
      updateItem.mutate({ restaurantId: myRestaurant.id, id: editItem.id, data }, {
        onSuccess: () => { toast({ title: "Item updated" }); refetch(); setDialogOpen(false); },
        onError: () => toast({ title: "Failed to update item", variant: "destructive" }),
      });
    } else {
      createItem.mutate({ restaurantId: myRestaurant.id, data }, {
        onSuccess: () => { toast({ title: "Item created" }); refetch(); setDialogOpen(false); },
        onError: () => toast({ title: "Failed to create item", variant: "destructive" }),
      });
    }
  };

  const handleDelete = (id: number) => {
    if (!myRestaurant) return;
    deleteItem.mutate({ restaurantId: myRestaurant.id, id }, {
      onSuccess: () => { toast({ title: "Item deleted" }); refetch(); },
    });
  };

  const toggleAvailable = (item: any) => {
    if (!myRestaurant) return;
    updateItem.mutate({ restaurantId: myRestaurant.id, id: item.id, data: { isAvailable: !item.isAvailable } }, {
      onSuccess: () => refetch(),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/restaurant/dashboard")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="font-display font-bold text-xl">Menu Management</h1>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" onClick={openCreate} data-testid="button-add-item">
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? "Edit" : "Add"} Menu Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Item name" className="mt-1" data-testid="input-item-name" />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Price (MAD)</Label>
                  <Input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} type="number" placeholder="0" className="mt-1" data-testid="input-item-price" />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Starters" className="mt-1" data-testid="input-item-category" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.isAvailable} onCheckedChange={(v) => setForm({ ...form, isAvailable: v })} />
                <Label>Available</Label>
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={handleSave} disabled={createItem.isPending || updateItem.isPending} data-testid="button-save-item">
                  {createItem.isPending || updateItem.isPending ? "Saving..." : "Save"}
                </Button>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
        ) : (menuItems ?? []).length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-2xl">
            <p>No menu items yet. Add your first item!</p>
          </div>
        ) : (menuItems ?? []).map((item) => (
          <div key={item.id} className="bg-card rounded-xl border border-card-border p-4 flex items-center gap-3" data-testid={`card-menu-item-${item.id}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm">{item.name}</p>
                <Badge variant="secondary" className="text-xs">{item.category}</Badge>
              </div>
              <p className="text-sm text-primary font-bold">{item.price} MAD</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Switch checked={item.isAvailable} onCheckedChange={() => toggleAvailable(item)} data-testid={`switch-available-${item.id}`} />
              <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => openEdit(item)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive" onClick={() => handleDelete(item.id)} data-testid={`button-delete-${item.id}`}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

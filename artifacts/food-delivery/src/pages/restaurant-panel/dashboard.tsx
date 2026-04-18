import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Package, DollarSign, Clock, TrendingUp, Bell, ChefHat, CheckCircle, XCircle, Truck, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useListRestaurants, useListOrders, useUpdateOrderStatus, useUpdateRestaurant } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const BUSINESS_TYPES = ["restaurant", "grocery", "pharmacy", "bakery"];

type RestaurantFormState = {
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

const statusColors: Record<string, string> = {
  pending: "bg-accent text-accent-foreground border-primary/20",
  accepted: "bg-primary/15 text-primary border-primary/25",
  preparing: "bg-primary/20 text-primary border-primary/30",
  ready: "bg-primary/25 text-primary border-primary/35",
  picked_up: "bg-primary text-primary-foreground border-primary",
  delivered: "bg-foreground text-background border-foreground",
  cancelled: "bg-muted text-muted-foreground border-border",
};

function ActionButtons({ order, onAction }: {
  order: any;
  onAction: (id: number, status: string) => void;
}) {
  switch (order.status) {
    case "pending":
      return (
        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 font-semibold"
            onClick={() => onAction(order.id, "accepted")}
          >
            <CheckCircle className="w-4 h-4" /> Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-border text-muted-foreground hover:bg-muted gap-1.5"
            onClick={() => onAction(order.id, "cancelled")}
          >
            <XCircle className="w-4 h-4" /> Reject
          </Button>
        </div>
      );
    case "accepted":
      return (
        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90 text-white gap-1.5 font-semibold shrink-0"
          onClick={() => onAction(order.id, "preparing")}
        >
          <ChefHat className="w-4 h-4" /> Start Preparing
        </Button>
      );
    case "preparing":
      return (
        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 font-semibold shrink-0"
          onClick={() => onAction(order.id, "ready")}
        >
          <Package className="w-4 h-4" /> Ready for Pickup
        </Button>
      );
    case "ready":
      return (
        <div className="flex items-center gap-2 shrink-0">
          <Truck className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-xs text-primary font-medium">Waiting for driver…</span>
        </div>
      );
    default:
      return null;
  }
}

export default function RestaurantDashboardPage() {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [newOrderAlert, setNewOrderAlert] = useState<any | null>(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const esRef = useRef<EventSource | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [restaurantForm, setRestaurantForm] = useState<RestaurantFormState>({
    name: "", category: "", businessType: "restaurant", address: "",
    phone: "", imageUrl: "", deliveryTime: "", deliveryFee: "", minimumOrder: "",
  });
  const updateRestaurant = useUpdateRestaurant();

  const { data: restaurants, refetch: refetchRestaurants } = useListRestaurants({ ownerId: user?.id });
  const myRestaurant = restaurants?.[0];

  const { data: orders, isLoading, refetch } = useListOrders(
    myRestaurant ? { restaurantId: myRestaurant.id } : undefined,
    { query: { enabled: !!myRestaurant, refetchInterval: 20000 } }
  );

  const updateStatus = useUpdateOrderStatus();

  const activeOrders = (orders ?? []).filter(o => !["delivered", "cancelled"].includes(o.status));
  const pendingOrders = activeOrders.filter(o => o.status === "pending");
  const revenue = (orders ?? []).filter(o => o.status === "delivered").reduce((s, o) => s + o.total, 0);

  // SSE: subscribe to restaurant channel for real-time order notifications
  useEffect(() => {
    if (!myRestaurant) return;

    const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
    const url = `${base}/api/events?channels=restaurant:${myRestaurant.id}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener("order_new", (e) => {
      const order = JSON.parse(e.data);
      setNewOrderAlert(order);
      setAlertVisible(true);
      setUnreadCount(n => n + 1);
      refetch();
      // Browser notification
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(`New order #${order.id}`, {
          body: `${order.items?.length ?? "?"} items — ${order.total?.toFixed(0)} MAD`,
          icon: "/favicon.ico",
        });
      }
      toast({ title: `🔔 New order #${order.id}`, description: `${order.items?.length ?? "?"} items — ${order.total?.toFixed(0)} MAD` });
    });

    es.addEventListener("order_status", () => {
      refetch();
    });

    es.onerror = () => { /* reconnect is automatic */ };

    // Request notification permission once
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => { es.close(); esRef.current = null; };
  }, [myRestaurant?.id]);

  const handleAction = (orderId: number, status: string) => {
    updateStatus.mutate({ id: orderId, data: { status: status as any } }, {
      onSuccess: () => {
        toast({ title: status === "cancelled" ? "Order rejected" : `Order ${status}` });
        refetch();
      },
    });
  };

  const openSettings = () => {
    if (!myRestaurant) return;
    setRestaurantForm({
      name: myRestaurant.name,
      category: myRestaurant.category,
      businessType: myRestaurant.businessType,
      address: myRestaurant.address,
      phone: myRestaurant.phone ?? "",
      imageUrl: myRestaurant.imageUrl ?? "",
      deliveryTime: myRestaurant.deliveryTime != null ? String(myRestaurant.deliveryTime) : "",
      deliveryFee: myRestaurant.deliveryFee != null ? String(myRestaurant.deliveryFee) : "",
      minimumOrder: myRestaurant.minimumOrder != null ? String(myRestaurant.minimumOrder) : "",
    });
    setSettingsOpen(true);
  };

  const handleSaveRestaurant = () => {
    if (!myRestaurant) return;
    if (!restaurantForm.name.trim() || !restaurantForm.category.trim() || !restaurantForm.address.trim()) {
      toast({ title: "Name, category and address are required", variant: "destructive" });
      return;
    }
    const numOrUndef = (s: string) => {
      if (!s) return undefined;
      const n = parseFloat(s);
      return Number.isFinite(n) ? n : undefined;
    };
    const intOrUndef = (s: string) => {
      if (!s) return undefined;
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? n : undefined;
    };
    const payload = {
      name: restaurantForm.name.trim(),
      category: restaurantForm.category.trim(),
      businessType: restaurantForm.businessType,
      address: restaurantForm.address.trim(),
      phone: restaurantForm.phone.trim() || undefined,
      imageUrl: restaurantForm.imageUrl.trim() || undefined,
      deliveryTime: intOrUndef(restaurantForm.deliveryTime),
      deliveryFee: numOrUndef(restaurantForm.deliveryFee),
      minimumOrder: numOrUndef(restaurantForm.minimumOrder),
    };
    updateRestaurant.mutate({ id: myRestaurant.id, data: payload }, {
      onSuccess: () => {
        toast({ title: "Restaurant updated" });
        refetchRestaurants();
        setSettingsOpen(false);
      },
      onError: () => toast({ title: "Failed to update restaurant", variant: "destructive" }),
    });
  };

  const dismissAlert = () => {
    setAlertVisible(false);
    setUnreadCount(0);
  };

  if (!myRestaurant) {
    return (
      <div className="text-center py-20">
        <p className="text-lg font-semibold mb-2">{t("restaurantPanel.noRestaurantFound")}</p>
        <p className="text-muted-foreground text-sm">{t("restaurantPanel.notLinked")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* New order alert banner */}
      {alertVisible && newOrderAlert && (
        <div className="bg-accent border border-primary/20 rounded-2xl p-4 flex items-start gap-4 animate-in slide-in-from-top duration-300">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-primary">New order #{newOrderAlert.id} just came in!</p>
            <p className="text-sm text-primary mt-0.5">
              {newOrderAlert.items?.length ?? "?"} items · {newOrderAlert.total?.toFixed(0)} MAD · {newOrderAlert.deliveryAddress}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-white"
              onClick={() => { handleAction(newOrderAlert.id, "accepted"); dismissAlert(); }}
            >
              Accept
            </Button>
            <Button size="sm" variant="ghost" className="text-primary" onClick={dismissAlert}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl flex items-center gap-3">
            {myRestaurant.name}
            {unreadCount > 0 && (
              <span className="text-xs bg-destructive text-white font-bold px-2 py-0.5 rounded-full animate-pulse">
                {unreadCount} new
              </span>
            )}
          </h1>
          <p className="text-muted-foreground text-sm">{t("restaurantPanel.panel")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={openSettings} data-testid="button-edit-restaurant">
            <Settings className="w-4 h-4" />
            Edit details
          </Button>
          <Button variant="outline" size="sm" onClick={() => setLocation("/restaurant/menu")}>
            {t("restaurantPanel.manageMenu")}
          </Button>
        </div>
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit restaurant details</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Name</Label>
              <Input value={restaurantForm.name} onChange={(e) => setRestaurantForm({ ...restaurantForm, name: e.target.value })} className="mt-1" data-testid="input-restaurant-name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Input value={restaurantForm.category} onChange={(e) => setRestaurantForm({ ...restaurantForm, category: e.target.value })} placeholder="e.g. Moroccan" className="mt-1" data-testid="input-restaurant-category" />
              </div>
              <div>
                <Label>Business Type</Label>
                <Select value={restaurantForm.businessType} onValueChange={(v) => setRestaurantForm({ ...restaurantForm, businessType: v })}>
                  <SelectTrigger className="mt-1" data-testid="select-business-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((bt) => (
                      <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Input value={restaurantForm.address} onChange={(e) => setRestaurantForm({ ...restaurantForm, address: e.target.value })} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Phone</Label>
                <Input value={restaurantForm.phone} onChange={(e) => setRestaurantForm({ ...restaurantForm, phone: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Delivery time (min)</Label>
                <Input type="number" value={restaurantForm.deliveryTime} onChange={(e) => setRestaurantForm({ ...restaurantForm, deliveryTime: e.target.value })} className="mt-1" data-testid="input-delivery-time" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Delivery fee (MAD)</Label>
                <Input type="number" value={restaurantForm.deliveryFee} onChange={(e) => setRestaurantForm({ ...restaurantForm, deliveryFee: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Min. order (MAD)</Label>
                <Input type="number" value={restaurantForm.minimumOrder} onChange={(e) => setRestaurantForm({ ...restaurantForm, minimumOrder: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Image URL</Label>
              <Input value={restaurantForm.imageUrl} onChange={(e) => setRestaurantForm({ ...restaurantForm, imageUrl: e.target.value })} placeholder="https://..." className="mt-1" data-testid="input-image-url" />
              {restaurantForm.imageUrl && (
                <img src={restaurantForm.imageUrl} alt="" className="mt-2 w-full h-32 object-cover rounded-lg border" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRestaurant} disabled={updateRestaurant.isPending} data-testid="button-save-restaurant">
              {updateRestaurant.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border border-card-border p-4">
          <Package className="w-5 h-5 text-primary mb-2" />
          <p className="font-bold text-2xl">{activeOrders.length}</p>
          <p className="text-xs text-muted-foreground">{t("restaurantPanel.activeOrders")}</p>
        </div>
        <div className="bg-card rounded-2xl border border-card-border p-4">
          <DollarSign className="w-5 h-5 text-primary mb-2" />
          <p className="font-bold text-2xl">{revenue.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">{t("restaurantPanel.revenue")}</p>
        </div>
        <div className="bg-card rounded-2xl border border-card-border p-4 relative">
          <TrendingUp className="w-5 h-5 text-primary mb-2" />
          <p className="font-bold text-2xl">{orders?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground">{t("restaurantPanel.totalOrders")}</p>
          {pendingOrders.length > 0 && (
            <span className="absolute top-3 right-3 w-5 h-5 bg-destructive text-white text-xs font-bold rounded-full flex items-center justify-center">
              {pendingOrders.length}
            </span>
          )}
        </div>
        <div className="bg-card rounded-2xl border border-card-border p-4">
          <Clock className="w-5 h-5 text-primary mb-2" />
          <p className="font-bold text-2xl">{myRestaurant.deliveryTime ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{t("restaurantPanel.avgDelivery")}</p>
        </div>
      </div>

      {/* Active Orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">
            {t("restaurantPanel.activeOrdersList")}
            {pendingOrders.length > 0 && (
              <span className="ml-2 text-xs bg-accent text-primary font-semibold px-2 py-0.5 rounded-full border ">
                {pendingOrders.length} awaiting action
              </span>
            )}
          </h2>
        </div>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-2xl">
            <p>{t("restaurantPanel.noActiveOrders")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Pending orders first */}
            {[...activeOrders].sort((a, b) => {
              if (a.status === "pending" && b.status !== "pending") return -1;
              if (b.status === "pending" && a.status !== "pending") return 1;
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }).map((order) => (
              <div
                key={order.id}
                className={`bg-card rounded-2xl border p-4 flex items-center gap-4 transition-all ${
                  order.status === "pending" ? "border-yellow-300 shadow-sm shadow-yellow-100" : "border-card-border"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-semibold text-sm">Order #{order.id}</span>
                    <Badge className={`text-xs border ${statusColors[order.status]}`}>
                      {t(`status.${order.status}`, { defaultValue: order.status })}
                    </Badge>
                    {order.status === "pending" && (
                      <span className="text-xs text-primary font-medium animate-pulse">● Action needed</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {order.items.length} item{order.items.length !== 1 ? "s" : ""} · {order.total.toFixed(0)} MAD
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{order.deliveryAddress}</p>
                </div>
                <ActionButtons order={order} onAction={handleAction} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

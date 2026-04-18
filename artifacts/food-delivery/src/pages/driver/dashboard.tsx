import { useEffect, useRef, useState } from "react";
import { Truck, DollarSign, Package, Star, Navigation, NavigationOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  useListDrivers, useUpdateDriver, useGetDriverEarnings, useListOrders, useUpdateOrderStatus,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

async function updateDriverLocation(driverId: number, lat: number, lng: number) {
  const token = localStorage.getItem("tawsila_token");
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
  await fetch(`${base}/api/drivers/${driverId}/location`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ latitude: lat, longitude: lng }),
  });
}

export default function DriverDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [locationSharing, setLocationSharing] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const { data: drivers, refetch: refetchDrivers } = useListDrivers();
  const myDriver = drivers?.find((d) => d.userId === user?.id);

  const { data: earnings, isLoading: earningsLoading } = useGetDriverEarnings(
    myDriver?.id ?? 0,
    { query: { enabled: !!myDriver } }
  );

  const { data: orders, isLoading: ordersLoading, refetch: refetchOrders } = useListOrders(
    myDriver ? { driverId: myDriver.id } : undefined,
    { query: { enabled: !!myDriver } }
  );

  const updateDriver = useUpdateDriver();
  const updateStatus = useUpdateOrderStatus();

  // Auto-start location sharing when driver becomes available
  useEffect(() => {
    if (myDriver?.isAvailable && !locationSharing) {
      startLocationSharing();
    }
    if (!myDriver?.isAvailable && locationSharing) {
      stopLocationSharing();
    }
  }, [myDriver?.isAvailable]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  function startLocationSharing() {
    if (!("geolocation" in navigator)) {
      setLocationError("Geolocation not supported by your browser");
      return;
    }
    if (!myDriver) return;

    setLocationError(null);
    setLocationSharing(true);

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        updateDriverLocation(myDriver.id, pos.coords.latitude, pos.coords.longitude).catch(() => {});
      },
      (err) => {
        setLocationError(err.code === 1 ? "Location permission denied" : "Could not get your location");
        setLocationSharing(false);
        watchIdRef.current = null;
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    watchIdRef.current = id;
  }

  function stopLocationSharing() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setLocationSharing(false);
  }

  const toggleAvailable = () => {
    if (!myDriver) return;
    updateDriver.mutate({ id: myDriver.id, data: { isAvailable: !myDriver.isAvailable } }, {
      onSuccess: () => { toast({ title: "Status updated" }); refetchDrivers(); },
    });
  };

  const handleStatusChange = (orderId: number, status: string) => {
    updateStatus.mutate({ id: orderId, data: { status: status as any } }, {
      onSuccess: () => { toast({ title: "Status updated" }); refetchOrders(); },
    });
  };

  const activeOrders = (orders ?? []).filter(o => ["accepted", "preparing", "ready", "picked_up"].includes(o.status));

  if (!myDriver) {
    return (
      <div className="text-center py-20">
        <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="font-semibold mb-1">No driver profile found</p>
        <p className="text-muted-foreground text-sm">Your account is not linked to a driver profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl">Driver Panel</h1>
          <p className="text-muted-foreground text-sm">Welcome, {user?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={myDriver.isAvailable} onCheckedChange={toggleAvailable} data-testid="switch-driver-available" />
          <Label className="text-sm">{myDriver.isAvailable ? "Available" : "Offline"}</Label>
        </div>
      </div>

      {/* Status + location badge */}
      <div className={`p-4 rounded-xl text-center font-semibold ${myDriver.isAvailable ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
        {myDriver.isAvailable ? "You are available for deliveries" : "You are offline"}
      </div>

      {/* Location sharing panel */}
      <div className="bg-card rounded-2xl border border-card-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {locationSharing
              ? <Navigation className="w-5 h-5 text-green-500 animate-pulse" />
              : <NavigationOff className="w-5 h-5 text-muted-foreground" />
            }
            <div>
              <p className="font-semibold text-sm">
                {locationSharing ? "Sharing live location" : "Location sharing off"}
              </p>
              <p className="text-xs text-muted-foreground">
                {locationSharing
                  ? "Customers can see where you are"
                  : "Turn on so customers can track you"}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant={locationSharing ? "outline" : "default"}
            className="gap-1.5 rounded-xl"
            onClick={locationSharing ? stopLocationSharing : startLocationSharing}
          >
            {locationSharing ? (
              <><NavigationOff className="w-3.5 h-3.5" /> Stop</>
            ) : (
              <><Navigation className="w-3.5 h-3.5" /> Start</>
            )}
          </Button>
        </div>
        {locationError && (
          <p className="text-xs text-destructive mt-2">{locationError}</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border border-card-border p-4">
          <Package className="w-5 h-5 text-primary mb-2" />
          <p className="font-bold text-2xl">{myDriver.totalDeliveries}</p>
          <p className="text-xs text-muted-foreground">Total Deliveries</p>
        </div>
        <div className="bg-card rounded-2xl border border-card-border p-4">
          <Star className="w-5 h-5 text-yellow-500 mb-2" />
          <p className="font-bold text-2xl">{myDriver.rating?.toFixed(1) ?? "N/A"}</p>
          <p className="text-xs text-muted-foreground">Rating</p>
        </div>
        <div className="bg-card rounded-2xl border border-card-border p-4">
          <DollarSign className="w-5 h-5 text-green-600 mb-2" />
          {earningsLoading ? <Skeleton className="h-8 w-16" /> : (
            <p className="font-bold text-2xl">{((earnings as any)?.thisMonth ?? 0).toFixed(0)}</p>
          )}
          <p className="text-xs text-muted-foreground">This Month (MAD)</p>
        </div>
        <div className="bg-card rounded-2xl border border-card-border p-4">
          <Truck className="w-5 h-5 text-blue-600 mb-2" />
          {earningsLoading ? <Skeleton className="h-8 w-16" /> : (
            <p className="font-bold text-2xl">{(earnings?.completedToday ?? 0)}</p>
          )}
          <p className="text-xs text-muted-foreground">Today</p>
        </div>
      </div>

      {/* Active deliveries */}
      <div>
        <h2 className="font-semibold mb-3">Active Deliveries</h2>
        {ordersLoading ? (
          <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        ) : activeOrders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-2xl">
            <p>No active deliveries</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeOrders.map((order) => (
              <div key={order.id} className="bg-card rounded-2xl border border-card-border p-4" data-testid={`card-delivery-${order.id}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sm">Order #{order.id}</p>
                    <p className="text-xs text-muted-foreground">{order.restaurantName}</p>
                  </div>
                  <Badge className="text-xs border-0 bg-primary/10 text-primary">{order.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{order.deliveryAddress}</p>
                <div className="flex items-center gap-2">
                  <Select defaultValue={order.status} onValueChange={(val) => handleStatusChange(order.id, val)}>
                    <SelectTrigger className="h-8 text-xs" data-testid={`select-delivery-status-${order.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="picked_up">Picked Up</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

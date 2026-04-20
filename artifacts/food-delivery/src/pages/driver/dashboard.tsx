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
import { useTranslation } from "react-i18next";

async function updateDriverLocation(driverId: number, lat: number, lng: number) {
  const token = localStorage.getItem("jatek_token");
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
  const { t } = useTranslation();
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

  useEffect(() => {
    if (myDriver?.isAvailable && !locationSharing) {
      startLocationSharing();
    }
    if (!myDriver?.isAvailable && locationSharing) {
      stopLocationSharing();
    }
  }, [myDriver?.isAvailable]);

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
      onSuccess: () => { toast({ title: t("driver.statusUpdated") }); refetchDrivers(); },
    });
  };

  const handleStatusChange = (orderId: number, status: string) => {
    updateStatus.mutate({ id: orderId, data: { status: status as any } }, {
      onSuccess: () => { toast({ title: t("driver.statusUpdated") }); refetchOrders(); },
    });
  };

  const activeOrders = (orders ?? []).filter(o => ["accepted", "preparing", "ready", "picked_up"].includes(o.status));

  if (!myDriver) {
    return (
      <div className="text-center py-20">
        <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="font-semibold mb-1">{t("driver.noDriverProfile")}</p>
        <p className="text-muted-foreground text-sm">{t("driver.notLinked")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl">{t("driver.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("driver.welcome", { name: user?.name })}</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={myDriver.isAvailable} onCheckedChange={toggleAvailable} data-testid="switch-driver-available" />
          <Label className="text-sm">{myDriver.isAvailable ? t("driver.available") : t("driver.offline")}</Label>
        </div>
      </div>

      {/* Status badge */}
      <div className={`p-4 rounded-xl text-center font-semibold ${myDriver.isAvailable ? "bg-brand-turquoise-soft text-brand-turquoise border border-brand-turquoise/30" : "bg-muted text-muted-foreground"}`}>
        {myDriver.isAvailable ? t("driver.availableForDeliveries") : t("driver.youAreOffline")}
      </div>

      {/* Location sharing panel */}
      <div className="bg-card rounded-2xl border border-card-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {locationSharing
              ? <Navigation className="w-5 h-5 text-primary animate-pulse" />
              : <NavigationOff className="w-5 h-5 text-muted-foreground" />
            }
            <div>
              <p className="font-semibold text-sm">
                {locationSharing ? t("driver.sharingLocation") : t("driver.locationOff")}
              </p>
              <p className="text-xs text-muted-foreground">
                {locationSharing ? t("driver.customersCanSee") : t("driver.turnOnLocation")}
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
              <><NavigationOff className="w-3.5 h-3.5" /> {t("driver.stop")}</>
            ) : (
              <><Navigation className="w-3.5 h-3.5" /> {t("driver.start")}</>
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
          <p className="text-xs text-muted-foreground">{t("driver.totalDeliveries")}</p>
        </div>
        <div className="bg-card rounded-2xl border border-card-border p-4">
          <Star className="w-5 h-5 text-brand-yellow mb-2 fill-brand-yellow" />
          <p className="font-bold text-2xl">{myDriver.rating?.toFixed(1) ?? "N/A"}</p>
          <p className="text-xs text-muted-foreground">{t("driver.rating")}</p>
        </div>
        <div className="bg-card rounded-2xl border border-card-border p-4">
          <DollarSign className="w-5 h-5 text-primary mb-2" />
          {earningsLoading ? <Skeleton className="h-8 w-16" /> : (
            <p className="font-bold text-2xl">{((earnings as any)?.thisMonth ?? 0).toFixed(0)}</p>
          )}
          <p className="text-xs text-muted-foreground">{t("driver.thisMonth")}</p>
        </div>
        <div className="bg-card rounded-2xl border border-card-border p-4">
          <Truck className="w-5 h-5 text-primary mb-2" />
          {earningsLoading ? <Skeleton className="h-8 w-16" /> : (
            <p className="font-bold text-2xl">{(earnings?.completedToday ?? 0)}</p>
          )}
          <p className="text-xs text-muted-foreground">{t("driver.today")}</p>
        </div>
      </div>

      {/* Active deliveries */}
      <div>
        <h2 className="font-semibold mb-3">{t("driver.activeDeliveries")}</h2>
        {ordersLoading ? (
          <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        ) : activeOrders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-2xl">
            <p>{t("driver.noActiveDeliveries")}</p>
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
                  <Badge className={`text-xs border-0 ${
                    order.status === "picked_up" ? "bg-primary text-primary-foreground" :
                    order.status === "ready" ? "bg-brand-turquoise text-brand-turquoise-foreground" :
                    "bg-brand-yellow text-brand-yellow-foreground"
                  }`}>{t(`status.${order.status}`, { defaultValue: order.status })}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{order.deliveryAddress}</p>
                <div className="flex items-center gap-2">
                  <Select defaultValue={order.status} onValueChange={(val) => handleStatusChange(order.id, val)}>
                    <SelectTrigger className="h-8 text-xs" data-testid={`select-delivery-status-${order.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="picked_up">{t("driver.pickedUp")}</SelectItem>
                      <SelectItem value="delivered">{t("driver.delivered")}</SelectItem>
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

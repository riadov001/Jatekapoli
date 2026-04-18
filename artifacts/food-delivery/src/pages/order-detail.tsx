import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, CheckCircle, Clock, Package, Truck, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useGetOrder } from "@workspace/api-client-react";
import { DeliveryMap } from "@/components/DeliveryMap";

const steps = [
  { key: "pending", label: "Order Placed", icon: Package },
  { key: "accepted", label: "Accepted", icon: CheckCircle },
  { key: "preparing", label: "Preparing", icon: Clock },
  { key: "ready", label: "Ready", icon: CheckCircle },
  { key: "picked_up", label: "On the way", icon: Truck },
  { key: "delivered", label: "Delivered", icon: MapPin },
];

const statusOrder = ["pending", "accepted", "preparing", "ready", "picked_up", "delivered"];

interface DriverLocation {
  latitude: number | null;
  longitude: number | null;
  locationUpdatedAt: string | null;
  name?: string;
}

export default function OrderDetailPage() {
  const [match, params] = useRoute("/orders/:id");
  const [_, setLocation] = useLocation();
  const id = match ? parseInt(params!.id, 10) : 0;

  const { data: order, isLoading } = useGetOrder(id, { query: { enabled: !!id, refetchInterval: 15000 } });

  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);

  // Poll driver location when order is picked_up (driver is heading to customer)
  useEffect(() => {
    if (!order?.driverId || order.status !== "picked_up") {
      setDriverLocation(null);
      return;
    }

    const fetchLocation = async () => {
      try {
        const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
        const token = localStorage.getItem("tawsila_token");
        const res = await fetch(`${base}/api/drivers/${order.driverId}/location`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setDriverLocation(data);
        }
      } catch {}
    };

    fetchLocation();
    const interval = setInterval(fetchLocation, 10000);
    return () => clearInterval(interval);
  }, [order?.driverId, order?.status]);

  if (!match) return <div>Not found</div>;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!order) return <div>Order not found</div>;

  const currentStepIndex = order.status === "cancelled"
    ? -1
    : statusOrder.indexOf(order.status);

  const showMap = ["picked_up"].includes(order.status) && !!order.driverId;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-6">
      <Button variant="ghost" size="sm" onClick={() => setLocation("/orders")} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        My Orders
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl">Order #{order.id}</h1>
          <p className="text-sm text-muted-foreground">{order.restaurantName}</p>
        </div>
        {order.status === "cancelled" ? (
          <Badge className="bg-gray-100 text-gray-600 border-0">Cancelled</Badge>
        ) : null}
      </div>

      {/* Live driver map */}
      {showMap && (
        <div className="bg-card rounded-2xl border border-card-border overflow-hidden">
          <div className="p-3 border-b border-border flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <p className="text-sm font-semibold">Driver is on the way</p>
            {driverLocation?.locationUpdatedAt && (
              <span className="text-xs text-muted-foreground ml-auto">
                Updated {new Date(driverLocation.locationUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
          <DeliveryMap
            driverLat={driverLocation?.latitude}
            driverLng={driverLocation?.longitude}
            driverName={driverLocation?.name || "Your driver"}
            className="h-56"
          />
        </div>
      )}

      {/* Progress tracker */}
      {order.status !== "cancelled" && (
        <div className="bg-card rounded-2xl border border-card-border p-4 sm:p-6">
          <h2 className="font-semibold mb-4 text-sm">Order Status</h2>
          <div className="relative">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isCompleted = idx <= currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div key={step.key} className="flex items-start gap-3 mb-4 last:mb-0" data-testid={`status-step-${step.key}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isCompleted ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  } ${isCurrent ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 pt-1">
                    <p className={`text-sm font-medium ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.label}
                    </p>
                    {isCurrent && order.estimatedDeliveryTime && (
                      <p className="text-xs text-primary mt-0.5">Est. {order.estimatedDeliveryTime} min remaining</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delivery address */}
      <div className="bg-card rounded-2xl border border-card-border p-4">
        <div className="flex items-start gap-3">
          <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Delivery to</p>
            <p className="text-sm text-muted-foreground">{order.deliveryAddress}</p>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-card rounded-2xl border border-card-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-sm">Order Items</h2>
        </div>
        {order.items.map((item, idx) => (
          <div key={item.id}>
            <div className="flex justify-between items-center px-4 py-3" data-testid={`order-item-${item.id}`}>
              <div>
                <span className="text-sm font-medium">{item.quantity}x {item.menuItemName}</span>
              </div>
              <span className="text-sm font-semibold text-primary">{item.totalPrice.toFixed(0)} MAD</span>
            </div>
            {idx < order.items.length - 1 && <Separator />}
          </div>
        ))}
        <Separator />
        <div className="p-4 space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Subtotal</span>
            <span>{order.subtotal.toFixed(0)} MAD</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Delivery fee</span>
            <span>{order.deliveryFee.toFixed(0)} MAD</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-base">
            <span>Total</span>
            <span className="text-primary" data-testid="text-order-total">{order.total.toFixed(0)} MAD</span>
          </div>
        </div>
      </div>

      {order.notes && (
        <div className="bg-accent rounded-xl p-4">
          <p className="text-sm font-medium mb-1">Order Notes</p>
          <p className="text-sm text-muted-foreground">{order.notes}</p>
        </div>
      )}
    </div>
  );
}

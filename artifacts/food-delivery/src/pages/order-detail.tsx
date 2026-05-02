import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, CheckCircle, Clock, Package, Truck, MapPin, MessageSquare, Star, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useGetOrder, getGetOrderQueryKey } from "@workspace/api-client-react";
import { DeliveryMap } from "@/components/DeliveryMap";
import { ChatPanel } from "@/components/ChatPanel";
import { OrderRatingModal } from "@/components/OrderRatingModal";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";

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
  const { t } = useTranslation();
  const { toast } = useToast();
  const id = match ? parseInt(params!.id, 10) : 0;

  const { data: order, isLoading, refetch } = useGetOrder(id, { query: { queryKey: getGetOrderQueryKey(id), enabled: !!id, refetchInterval: 20000 } });

  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [reordering, setReordering] = useState(false);

  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
  const token = localStorage.getItem("jatek_token");
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };

  // Real-time updates via SSE
  useEffect(() => {
    if (!id) return;
    const channels = [`order:${id}`, order?.driverId ? `driver:${order.driverId}` : ""].filter(Boolean).join(",");
    const url = `${base}/api/events?channels=${encodeURIComponent(channels)}`;
    const es = new EventSource(url);
    es.addEventListener("order_status", () => { refetch(); });
    es.addEventListener("driver_location", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        if (data?.latitude != null && data?.longitude != null) {
          setDriverLocation((prev) => ({
            latitude: data.latitude,
            longitude: data.longitude,
            locationUpdatedAt: data.updatedAt ?? new Date().toISOString(),
            name: prev?.name,
          }));
        }
      } catch {}
    });
    es.onerror = () => {};
    return () => { es.close(); };
  }, [id, order?.driverId, refetch]);

  const steps = [
    { key: "pending", label: t("step.orderPlaced"), icon: Package },
    { key: "accepted", label: t("step.accepted"), icon: CheckCircle },
    { key: "preparing", label: t("step.preparing"), icon: Clock },
    { key: "ready", label: t("step.ready"), icon: CheckCircle },
    { key: "picked_up", label: t("step.onTheWay"), icon: Truck },
    { key: "delivered", label: t("step.delivered"), icon: MapPin },
  ];

  useEffect(() => {
    if (!order?.driverId || order.status !== "picked_up") {
      setDriverLocation(null);
      return;
    }
    const fetchLocation = async () => {
      try {
        const res = await fetch(`${base}/api/drivers/${order.driverId}/location`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) setDriverLocation(await res.json());
      } catch {}
    };
    fetchLocation();
    const interval = setInterval(fetchLocation, 10000);
    return () => clearInterval(interval);
  }, [order?.driverId, order?.status]);

  const handleRateDriver = async (rating: number, comment: string) => {
    const res = await fetch(`${base}/api/orders/${id}/rate-driver`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ rating, comment }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Erreur");
    }
    refetch();
  };

  const handleReorder = async () => {
    setReordering(true);
    try {
      const res = await fetch(`${base}/api/orders/${id}/reorder`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Commande relancée !", description: "Votre nouvelle commande a bien été passée." });
        setLocation(`/orders/${data.id}`);
      } else {
        toast({ title: data.error ?? "Impossible de relancer la commande", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur réseau", variant: "destructive" });
    } finally {
      setReordering(false);
    }
  };

  if (!match) return <div>{t("orderDetail.notFound")}</div>;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!order) return <div>{t("orderDetail.notFound")}</div>;

  const currentStepIndex = order.status === "cancelled" ? -1 : statusOrder.indexOf(order.status);
  const showMap = ["picked_up"].includes(order.status) && !!order.driverId;
  const isDelivered = order.status === "delivered";
  const isActive = !["delivered", "cancelled"].includes(order.status);
  const canRate = isDelivered && !!(order as any).driverId && !(order as any).driverRating;
  const canChat = !["delivered", "cancelled"].includes(order.status) && !!(order as any).driverId;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-6">
      <Button variant="ghost" size="sm" onClick={() => setLocation("/orders")} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        {t("orderDetail.myOrders")}
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl">{(order as any).reference || `Order #${order.id}`}</h1>
          <p className="text-sm text-muted-foreground">{order.restaurantName}</p>
        </div>
        {order.status === "cancelled" ? (
          <Badge className="bg-gray-100 text-gray-600 border-0">{t("orderDetail.cancelled")}</Badge>
        ) : null}
      </div>

      {/* Action buttons — chat, rate, reorder */}
      <div className="flex flex-wrap gap-2">
        {canChat && (
          <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => setChatOpen(true)}>
            <MessageSquare className="w-4 h-4 text-primary" />
            Chat livreur
          </Button>
        )}
        {canRate && (
          <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => setRatingOpen(true)}>
            <Star className="w-4 h-4 text-yellow-500" />
            Évaluer
          </Button>
        )}
        {isDelivered && (
          <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={handleReorder} disabled={reordering}>
            <RotateCcw className={`w-4 h-4 text-brand-turquoise ${reordering ? "animate-spin" : ""}`} />
            {reordering ? "..." : "Recommander"}
          </Button>
        )}
      </div>

      {/* Driver rating already done */}
      {isDelivered && (order as any).driverRating && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-xl">
          <div className="flex">
            {[1,2,3,4,5].map((s) => (
              <Star key={s} className={`w-4 h-4 ${s <= (order as any).driverRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
            ))}
          </div>
          <span className="text-sm text-muted-foreground">Votre avis a été envoyé</span>
        </div>
      )}

      {/* Scheduled delivery badge */}
      {(order as any).deliveryType === "scheduled" && (order as any).scheduledFor && (
        <div className="flex items-center gap-2 p-3 bg-brand-turquoise-soft border border-brand-turquoise/30 rounded-xl">
          <Clock className="w-4 h-4 text-brand-turquoise shrink-0" />
          <div>
            <p className="text-sm font-semibold text-brand-turquoise">Livraison programmée</p>
            <p className="text-xs text-muted-foreground">
              {new Date((order as any).scheduledFor).toLocaleString("fr-FR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
      )}

      {/* Contactless badge */}
      {(order as any).isContactless && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-xl text-sm text-muted-foreground">
          <span>🚪</span>
          <span>Livraison sans contact — le livreur déposera votre commande à la porte</span>
        </div>
      )}

      {/* Delivery OTP — shown to customer as soon as the order is placed */}
      {(order as any).pickupCode && isActive && (
        <div className="bg-gradient-to-br from-primary via-primary to-brand-turquoise text-primary-foreground rounded-2xl p-5 text-center shadow-lg" data-testid="card-pickup-code">
          <p className="text-xs uppercase tracking-widest opacity-80 font-semibold mb-1">Code de remise</p>
          <p className="font-mono font-bold text-5xl tracking-[0.6rem] mt-2 drop-shadow" data-testid="text-pickup-code">
            {(order as any).pickupCode}
          </p>
          <p className="text-xs mt-3 opacity-85 leading-relaxed max-w-xs mx-auto">
            Communiquez ce code à votre livreur au moment de la remise de votre commande.
          </p>
        </div>
      )}

      {/* Live driver map */}
      {showMap && (
        <div className="bg-card rounded-2xl border border-card-border overflow-hidden">
          <div className="p-3 border-b border-border flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <p className="text-sm font-semibold">{t("orderDetail.driverOnWay")}</p>
            {driverLocation?.locationUpdatedAt && (
              <span className="text-xs text-muted-foreground ml-auto">
                Mis à jour {new Date(driverLocation.locationUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
          <DeliveryMap
            driverLat={driverLocation?.latitude}
            driverLng={driverLocation?.longitude}
            driverName={driverLocation?.name || t("orderDetail.yourDriver")}
            className="h-56"
          />
        </div>
      )}

      {/* Progress tracker */}
      {order.status !== "cancelled" && (
        <div className="bg-card rounded-2xl border border-card-border p-4 sm:p-6">
          <h2 className="font-semibold mb-4 text-sm">{t("orderDetail.orderStatus")}</h2>
          <div className="relative">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isCompleted = idx <= currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div key={step.key} className="flex items-start gap-3 mb-4 last:mb-0" data-testid={`status-step-${step.key}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isCurrent ? "bg-brand-yellow text-brand-yellow-foreground" :
                    isCompleted ? "bg-brand-turquoise text-brand-turquoise-foreground" :
                    "bg-muted text-muted-foreground"
                  } ${isCurrent ? "ring-2 ring-brand-yellow ring-offset-2 ring-offset-background" : ""}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 pt-1">
                    <p className={`text-sm font-medium ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                    {isCurrent && order.estimatedDeliveryTime && (
                      <p className="text-xs text-brand-turquoise mt-0.5 font-semibold">{t("orderDetail.estRemaining", { time: order.estimatedDeliveryTime })}</p>
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
            <p className="text-sm font-semibold">{t("orderDetail.deliveryTo")}</p>
            <p className="text-sm text-muted-foreground">{order.deliveryAddress}</p>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-card rounded-2xl border border-card-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-sm">{t("orderDetail.orderItems")}</h2>
        </div>
        {order.items.map((item, idx) => (
          <div key={item.id}>
            <div className="flex justify-between items-center px-4 py-3" data-testid={`order-item-${item.id}`}>
              <span className="text-sm font-medium">{item.quantity}x {item.menuItemName}</span>
              <span className="text-sm font-semibold text-primary">{item.totalPrice.toFixed(0)} MAD</span>
            </div>
            {idx < order.items.length - 1 && <Separator />}
          </div>
        ))}
        <Separator />
        <div className="p-4 space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{t("orderDetail.subtotal")}</span>
            <span>{order.subtotal.toFixed(0)} MAD</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{t("orderDetail.deliveryFee")}</span>
            <span>{order.deliveryFee.toFixed(0)} MAD</span>
          </div>
          {(order as any).discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
              <span>Réduction {(order as any).promoCode && <span className="font-mono text-xs">({(order as any).promoCode})</span>}</span>
              <span>-{((order as any).discountAmount as number).toFixed(0)} MAD</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-bold text-base">
            <span>{t("orderDetail.total")}</span>
            <span className="text-primary" data-testid="text-order-total">{order.total.toFixed(0)} MAD</span>
          </div>
        </div>
      </div>

      {order.notes && (
        <div className="bg-accent rounded-xl p-4">
          <p className="text-sm font-medium mb-1">{t("orderDetail.orderNotes")}</p>
          <p className="text-sm text-muted-foreground">{order.notes}</p>
        </div>
      )}

      {/* Chat panel */}
      <ChatPanel orderId={id} open={chatOpen} onClose={() => setChatOpen(false)} />

      {/* Rating modal */}
      <OrderRatingModal
        open={ratingOpen}
        orderId={id}
        onClose={() => setRatingOpen(false)}
        onSubmit={handleRateDriver}
      />
    </div>
  );
}

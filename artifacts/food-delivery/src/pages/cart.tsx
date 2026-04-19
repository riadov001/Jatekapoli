import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateOrder } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=en`;
  const res = await fetch(url, { headers: { "User-Agent": "JatekApp/1.0" } });
  if (!res.ok) throw new Error("Geocoding failed");
  const data = await res.json();
  const addr = data.address || {};
  const parts = [
    addr.road || addr.pedestrian,
    addr.house_number,
    addr.suburb || addr.neighbourhood,
    addr.city || addr.town || addr.village,
  ].filter(Boolean);
  return parts.join(", ") || data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export default function CartPage() {
  const [_, setLocation] = useLocation();
  const { items, restaurantId, restaurantName, removeItem, updateQuantity, clearCart, subtotal, total } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const createOrder = useCreateOrder();
  const [deliveryAddress, setDeliveryAddress] = useState((user as any)?.address || "");
  const [notes, setNotes] = useState("");
  const [locating, setLocating] = useState(false);
  const DELIVERY_FEE = 15;

  const handleDetectLocation = () => {
    if (!("geolocation" in navigator)) {
      toast({ title: "Geolocation not supported by your browser", variant: "destructive" });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const address = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          setDeliveryAddress(address);
          toast({ title: "Location detected!", description: address });
        } catch {
          toast({ title: "Could not convert location to address", variant: "destructive" });
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        const msg = err.code === 1 ? "Location permission denied" : "Could not get your location";
        toast({ title: msg, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      toast({ title: "Please login first", variant: "destructive" });
      setLocation("/login");
      return;
    }
    if (!deliveryAddress.trim()) {
      toast({ title: "Please enter your delivery address", variant: "destructive" });
      return;
    }
    if (!restaurantId || items.length === 0) {
      toast({ title: t("cart.empty"), variant: "destructive" });
      return;
    }

    createOrder.mutate({
      data: {
        restaurantId: restaurantId!,
        deliveryAddress,
        notes: notes || undefined,
        items: items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
      },
    }, {
      onSuccess: (order) => {
        clearCart();
        toast({ title: "Order placed successfully!" });
        setLocation(`/orders/${order.id}`);
      },
      onError: () => {
        toast({ title: "Failed to place order. Please try again.", variant: "destructive" });
      },
    });
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
          <ShoppingBag className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="font-display font-bold text-xl mb-2">{t("cart.empty")}</h2>
        <p className="text-muted-foreground text-sm mb-6">{t("cart.emptyDesc")}</p>
        <Button onClick={() => setLocation("/restaurants")} data-testid="button-browse-restaurants">
          {t("cart.browseRestaurants")}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-6">
      <Button variant="ghost" size="sm" onClick={() => setLocation(-1 as any)} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        {t("cart.back")}
      </Button>

      <h1 className="font-display font-bold text-2xl">{t("cart.title")}</h1>
      <p className="text-sm text-muted-foreground -mt-4">{t("cart.from", { name: restaurantName })}</p>

      {/* Items */}
      <div className="bg-card rounded-2xl border border-card-border overflow-hidden">
        {items.map((item, idx) => (
          <div key={item.menuItemId}>
            <div className="flex items-center gap-4 p-4" data-testid={`cart-item-${item.menuItemId}`}>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" data-testid={`text-cart-item-name-${item.menuItemId}`}>{item.name}</p>
                <p className="text-xs text-muted-foreground">{t("cart.each", { price: item.price })}</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="w-7 h-7 rounded-full"
                  onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                  data-testid={`button-decrease-${item.menuItemId}`}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-6 text-center text-sm font-semibold" data-testid={`text-quantity-${item.menuItemId}`}>{item.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-7 h-7 rounded-full"
                  onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                  data-testid={`button-increase-${item.menuItemId}`}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>

              <div className="w-20 text-right">
                <p className="font-semibold text-sm text-primary">{(item.price * item.quantity).toFixed(0)} MAD</p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 text-destructive hover:bg-destructive/10"
                onClick={() => removeItem(item.menuItemId)}
                data-testid={`button-remove-${item.menuItemId}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
            {idx < items.length - 1 && <Separator />}
          </div>
        ))}
      </div>

      {/* Delivery Address */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="address" className="text-sm font-semibold">{t("cart.deliveryAddress")}</Label>
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={locating}
            className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline disabled:opacity-60"
          >
            {locating ? (
              <><Loader2 className="w-3 h-3 animate-spin" /> {t("cart.detecting")}</>
            ) : (
              <><MapPin className="w-3 h-3" /> {t("cart.useMyLocation")}</>
            )}
          </button>
        </div>
        <Input
          id="address"
          placeholder={t("cart.enterAddress")}
          value={deliveryAddress}
          onChange={(e) => setDeliveryAddress(e.target.value)}
          className="h-11"
          data-testid="input-delivery-address"
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes" className="text-sm font-semibold">{t("cart.orderNotes")}</Label>
        <Textarea
          id="notes"
          placeholder={t("cart.specialInstructions")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          data-testid="textarea-notes"
        />
      </div>

      {/* Summary */}
      <div className="bg-card rounded-2xl border border-card-border p-4 space-y-3">
        <h3 className="font-semibold">{t("cart.orderSummary")}</h3>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("cart.subtotal")}</span>
          <span>{subtotal.toFixed(0)} MAD</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("cart.deliveryFee")}</span>
          <span>{DELIVERY_FEE} MAD</span>
        </div>
        <Separator />
        <div className="flex justify-between font-bold text-base">
          <span>{t("cart.total")}</span>
          <span className="text-primary" data-testid="text-order-total">{(total + DELIVERY_FEE).toFixed(0)} MAD</span>
        </div>
      </div>

      <Button
        className="w-full h-12 text-base font-semibold rounded-xl"
        onClick={handlePlaceOrder}
        disabled={createOrder.isPending}
        data-testid="button-place-order"
      >
        {createOrder.isPending ? t("cart.placingOrder") : t("cart.placeOrder")}
      </Button>
    </div>
  );
}

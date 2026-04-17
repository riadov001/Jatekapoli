import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateOrder } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export default function CartPage() {
  const [_, setLocation] = useLocation();
  const { items, restaurantId, restaurantName, removeItem, updateQuantity, clearCart, subtotal, total } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const createOrder = useCreateOrder();
  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || "");
  const [notes, setNotes] = useState("");
  const DELIVERY_FEE = 15;

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
      toast({ title: "Your cart is empty", variant: "destructive" });
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
        <h2 className="font-display font-bold text-xl mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground text-sm mb-6">Add some delicious food from your favorite restaurants.</p>
        <Button onClick={() => setLocation("/restaurants")} data-testid="button-browse-restaurants">
          Browse Restaurants
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-6">
      <Button variant="ghost" size="sm" onClick={() => setLocation(-1 as any)} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      <h1 className="font-display font-bold text-2xl">Your Cart</h1>
      <p className="text-sm text-muted-foreground -mt-4">From {restaurantName}</p>

      {/* Items */}
      <div className="bg-card rounded-2xl border border-card-border overflow-hidden">
        {items.map((item, idx) => (
          <div key={item.menuItemId}>
            <div className="flex items-center gap-4 p-4" data-testid={`cart-item-${item.menuItemId}`}>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" data-testid={`text-cart-item-name-${item.menuItemId}`}>{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.price} MAD each</p>
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
      <div className="space-y-3">
        <Label htmlFor="address" className="text-sm font-semibold">Delivery Address</Label>
        <Input
          id="address"
          placeholder="Enter your delivery address in Oujda"
          value={deliveryAddress}
          onChange={(e) => setDeliveryAddress(e.target.value)}
          className="h-11"
          data-testid="input-delivery-address"
        />
      </div>

      {/* Notes */}
      <div className="space-y-3">
        <Label htmlFor="notes" className="text-sm font-semibold">Order Notes (optional)</Label>
        <Textarea
          id="notes"
          placeholder="Any special instructions..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          data-testid="textarea-notes"
        />
      </div>

      {/* Summary */}
      <div className="bg-card rounded-2xl border border-card-border p-4 space-y-3">
        <h3 className="font-semibold">Order Summary</h3>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{subtotal.toFixed(0)} MAD</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Delivery fee</span>
          <span>{DELIVERY_FEE} MAD</span>
        </div>
        <Separator />
        <div className="flex justify-between font-bold text-base">
          <span>Total</span>
          <span className="text-primary" data-testid="text-order-total">{(total + DELIVERY_FEE).toFixed(0)} MAD</span>
        </div>
      </div>

      <Button
        className="w-full h-12 text-base font-semibold rounded-xl"
        onClick={handlePlaceOrder}
        disabled={createOrder.isPending}
        data-testid="button-place-order"
      >
        {createOrder.isPending ? "Placing order..." : "Place Order"}
      </Button>
    </div>
  );
}

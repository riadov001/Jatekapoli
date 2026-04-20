import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Star, Clock, Truck, Award, Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetRestaurant, useListMenuItems, useListReviews } from "@workspace/api-client-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export default function RestaurantPage() {
  const [match, params] = useRoute("/restaurants/:id");
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { addItem, itemCount } = useCart();
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState("All");

  const id = match ? parseInt(params!.id, 10) : 0;

  const { data: restaurant, isLoading: restLoading } = useGetRestaurant(id, {
    query: { enabled: !!id },
  });
  const { data: menuItems, isLoading: menuLoading } = useListMenuItems(id, undefined, {
    query: { enabled: !!id },
  });
  const { data: reviews } = useListReviews({ restaurantId: id });

  if (!match || !id) {
    return <div>{t("restaurant.notFound")}</div>;
  }

  if (restLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (!restaurant) return <div>{t("restaurant.notFound")}</div>;

  const categories = ["All", ...Array.from(new Set(menuItems?.map((i) => i.category) ?? []))];
  const filteredItems = activeCategory === "All"
    ? menuItems ?? []
    : (menuItems ?? []).filter((i) => i.category === activeCategory);

  const handleAddToCart = (item: NonNullable<typeof menuItems>[number]) => {
    if (!item) return;
    if (!user) {
      toast({ title: "Please login to add items to cart", variant: "destructive" });
      setLocation("/login");
      return;
    }
    const pricing = restaurant as { deliveryFee?: number | null; freeDeliveryThreshold?: number | null };
    addItem(restaurant.id, restaurant.name, {
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      imageUrl: item.imageUrl,
    }, {
      deliveryFee: pricing.deliveryFee,
      freeDeliveryThreshold: pricing.freeDeliveryThreshold,
    });
    toast({ title: `${item.name} added to cart` });
  };

  return (
    <div className="pb-24 space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => setLocation(-1 as any)} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        {t("restaurant.back")}
      </Button>

      {/* Cover image */}
      <div className="relative h-56 sm:h-72 rounded-2xl overflow-visible bg-muted">
        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          {restaurant.coverImageUrl ? (
            <img src={restaurant.coverImageUrl} alt={restaurant.name} className="w-full h-full object-cover" />
          ) : restaurant.imageUrl ? (
            <img src={restaurant.imageUrl} alt={restaurant.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        {/* Circular merchant logo overlapping the cover */}
        {(restaurant.logoUrl || restaurant.imageUrl) && (
          <div className="absolute -bottom-7 left-5 sm:left-7 w-20 h-20 rounded-2xl ring-4 ring-background overflow-hidden shadow-xl shadow-black/30 bg-card transition-transform duration-300 hover:rotate-[-4deg] hover:scale-105">
            <img
              src={restaurant.logoUrl || restaurant.imageUrl!}
              alt={`${restaurant.name} logo`}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-start gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="font-display font-bold text-2xl text-white">{restaurant.name}</h1>
                {restaurant.isLocal && (
                  <Badge className="bg-brand-turquoise text-brand-turquoise-foreground text-xs gap-1 border-0">
                    <Award className="w-3 h-3" />
                    {t("restaurant.local")}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-white/80 text-sm">
                {restaurant.rating && (
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    {restaurant.rating.toFixed(1)} ({restaurant.reviewCount})
                  </span>
                )}
                {restaurant.deliveryTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {restaurant.deliveryTime} min
                  </span>
                )}
                {restaurant.deliveryFee !== null && restaurant.deliveryFee !== undefined && (
                  <span className={`flex items-center gap-1 ${restaurant.deliveryFee === 0 ? "text-brand-turquoise font-semibold" : ""}`}>
                    <Truck className="w-3.5 h-3.5" />
                    {restaurant.deliveryFee === 0 ? t("restaurant.free") : t("restaurant.delivery", { fee: restaurant.deliveryFee })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {restaurant.description && (
        <p className="text-muted-foreground text-sm">{restaurant.description}</p>
      )}

      {/* Menu categories */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? "default" : "outline"}
            size="sm"
            className="shrink-0 rounded-full"
            onClick={() => setActiveCategory(cat)}
            data-testid={`button-menu-category-${cat.toLowerCase()}`}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Menu items */}
      <div className="space-y-3">
        {menuLoading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-3 p-4 rounded-xl border border-card-border">
              <Skeleton className="w-24 h-24 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))
        ) : filteredItems.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">{t("restaurant.noItems")}</p>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className="flex gap-4 p-3 rounded-2xl bg-card hover:shadow-md hover:shadow-black/5 transition-shadow" data-testid={`card-menu-item-${item.id}`}>
              {/* Image with overlay + button (no border, larger) */}
              <div className="relative w-32 h-32 sm:w-36 sm:h-36 shrink-0 rounded-2xl overflow-hidden bg-muted shadow-sm">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">🍽</div>
                )}
                {item.isPopular && (
                  <span className="absolute top-1.5 left-1.5 inline-flex items-center bg-brand-yellow text-brand-yellow-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    {t("restaurant.popular")}
                  </span>
                )}
                {item.isAvailable ? (
                  <button
                    onClick={() => handleAddToCart(item)}
                    aria-label={t("restaurant.add")}
                    className="absolute bottom-1.5 right-1.5 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/40 hover:scale-105 active:scale-95 transition-transform"
                    data-testid={`button-add-${item.id}`}
                  >
                    <Plus className="w-5 h-5" strokeWidth={3} />
                  </button>
                ) : (
                  <span className="absolute bottom-1.5 right-1.5 text-[10px] font-bold bg-black/60 text-white px-2 py-1 rounded-full">
                    {t("restaurant.unavailable")}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0 py-1">
                <h3 className="font-semibold text-sm sm:text-base leading-tight">{item.name}</h3>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{item.description}</p>
                )}
                <div className="mt-2">
                  <span className="font-bold text-base text-primary" data-testid={`text-price-${item.id}`}>{item.price} MAD</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reviews */}
      {reviews && reviews.length > 0 && (
        <div>
          <h2 className="font-display font-bold text-xl mb-3">{t("restaurant.reviews")}</h2>
          <div className="space-y-3">
            {reviews.slice(0, 5).map((review) => (
              <div key={review.id} className="p-4 rounded-xl border border-card-border bg-card" data-testid={`card-review-${review.id}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">{review.userName}</span>
                  <div className="flex items-center gap-1">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
                {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating comics-style cart button */}
      {itemCount > 0 && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50">
          <button
            className="comics-btn"
            onClick={() => setLocation("/cart")}
            data-testid="button-view-cart"
          >
            <ShoppingBag className="w-5 h-5" />
            <span>{t("restaurant.viewCart", { count: itemCount })}</span>
          </button>
        </div>
      )}
    </div>
  );
}

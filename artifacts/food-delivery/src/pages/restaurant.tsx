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
    addItem(restaurant.id, restaurant.name, {
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      imageUrl: item.imageUrl,
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
      <div className="relative h-56 sm:h-72 rounded-2xl overflow-hidden bg-muted">
        {restaurant.coverImageUrl ? (
          <img src={restaurant.coverImageUrl} alt={restaurant.name} className="w-full h-full object-cover" />
        ) : restaurant.imageUrl ? (
          <img src={restaurant.imageUrl} alt={restaurant.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-start gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="font-display font-bold text-2xl text-white">{restaurant.name}</h1>
                {restaurant.isLocal && (
                  <Badge className="bg-green-500 text-white text-xs gap-1">
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
                  <span className="flex items-center gap-1">
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
            <div key={item.id} className="flex gap-4 p-4 rounded-xl border border-card-border bg-card hover:shadow-sm transition-shadow" data-testid={`card-menu-item-${item.id}`}>
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-24 h-24 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-24 h-24 rounded-xl bg-muted shrink-0 flex items-center justify-center text-3xl">
                  🍽
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">{item.name}</h3>
                      {item.isPopular && (
                        <Badge variant="secondary" className="text-xs bg-accent text-accent-foreground">{t("restaurant.popular")}</Badge>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="font-bold text-base text-primary" data-testid={`text-price-${item.id}`}>{item.price} MAD</span>
                  {item.isAvailable ? (
                    <Button
                      size="sm"
                      className="h-8 gap-1 rounded-full px-3"
                      onClick={() => handleAddToCart(item)}
                      data-testid={`button-add-${item.id}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {t("restaurant.add")}
                    </Button>
                  ) : (
                    <Badge variant="secondary" className="text-xs">{t("restaurant.unavailable")}</Badge>
                  )}
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

      {/* Floating cart button */}
      {itemCount > 0 && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50">
          <Button
            className="rounded-2xl px-6 h-12 shadow-lg gap-2 text-base font-semibold"
            onClick={() => setLocation("/cart")}
            data-testid="button-view-cart"
          >
            <ShoppingBag className="w-5 h-5" />
            {t("restaurant.viewCart", { count: itemCount })}
          </Button>
        </div>
      )}
    </div>
  );
}

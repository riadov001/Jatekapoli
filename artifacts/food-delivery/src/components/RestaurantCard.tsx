import { Link } from "wouter";
import { Star, Clock, Truck, Award, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Restaurant {
  id: number;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  category: string;
  isLocal: boolean;
  isOpen: boolean;
  rating?: number | null;
  reviewCount: number;
  deliveryTime?: number | null;
  deliveryFee?: number | null;
  minimumOrder?: number | null;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  Moroccan: "🥘",
  Pizza: "🍕",
  Burgers: "🍔",
  Sushi: "🍣",
  Sandwiches: "🥙",
  Chicken: "🍗",
  Seafood: "🦞",
  Sweets: "🍰",
  Drinks: "🧋",
};

export function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const categoryEmoji = CATEGORY_EMOJIS[restaurant.category] || "🍽️";

  return (
    <Link href={`/restaurants/${restaurant.id}`} data-testid={`card-restaurant-${restaurant.id}`}>
      <div className="group bg-card rounded-2xl border border-card-border overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-black/8 hover:-translate-y-1 active:scale-[0.99]">
        {/* Image */}
        <div className="relative h-44 bg-muted overflow-hidden">
          {restaurant.imageUrl ? (
            <img
              src={restaurant.imageUrl}
              alt={restaurant.name}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/15 via-primary/8 to-orange-50 dark:to-orange-950/20 flex items-center justify-center">
              <span className="text-5xl">{categoryEmoji}</span>
            </div>
          )}

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

          {/* Top badges */}
          <div className="absolute top-3 left-3 flex gap-1.5">
            {restaurant.isLocal && (
              <Badge className="bg-green-500 hover:bg-green-500 text-white text-xs gap-1 font-semibold shadow-sm" data-testid={`badge-local-${restaurant.id}`}>
                <Award className="w-3 h-3" />
                Local
              </Badge>
            )}
            {!restaurant.isOpen && (
              <Badge variant="secondary" className="text-xs bg-black/60 hover:bg-black/60 text-white border-0">Closed</Badge>
            )}
          </div>

          {/* Category top right */}
          <div className="absolute top-3 right-3">
            <span className="text-xl" title={restaurant.category}>{categoryEmoji}</span>
          </div>

          {/* Rating overlay (bottom right) */}
          {restaurant.rating && (
            <div
              className="absolute bottom-3 right-3 flex items-center gap-1 bg-white/95 dark:bg-black/70 backdrop-blur-sm rounded-full px-2 py-0.5 shadow-sm"
              data-testid={`text-rating-${restaurant.id}`}
            >
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-bold text-foreground">{restaurant.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-base text-foreground leading-snug" data-testid={`text-restaurant-name-${restaurant.id}`}>
              {restaurant.name}
            </h3>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
          </div>

          {restaurant.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{restaurant.description}</p>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {restaurant.deliveryTime && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-primary/70" />
                <span className="font-medium text-foreground">{restaurant.deliveryTime} min</span>
              </span>
            )}
            {restaurant.deliveryFee !== null && restaurant.deliveryFee !== undefined && (
              <span className="flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-primary/70" />
                <span className={`font-medium ${restaurant.deliveryFee === 0 ? "text-green-600 dark:text-green-400" : "text-foreground"}`}>
                  {restaurant.deliveryFee === 0 ? "Free delivery" : `${restaurant.deliveryFee} MAD`}
                </span>
              </span>
            )}
            {restaurant.reviewCount > 0 && (
              <span className="text-muted-foreground ml-auto">
                {restaurant.reviewCount} review{restaurant.reviewCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

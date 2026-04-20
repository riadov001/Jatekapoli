import { Link } from "wouter";
import { Star, Clock, Truck, Award, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

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
  Moroccan: "🥘", Marocain: "🥘",
  Pizza: "🍕",
  Burgers: "🍔", Burger: "🍔",
  Sushi: "🍣",
  Sandwiches: "🥙", Sandwichs: "🥙",
  Chicken: "🍗", Poulet: "🍗",
  Seafood: "🦞",
  Sweets: "🍰", Végé: "🥗",
  Halal: "☪️",
  Épicerie: "🛒", "Grande surface": "🏪",
  Bio: "🌿", Primeur: "🥦",
  Pharmacie: "💊", Parapharmacie: "🧴",
  Optique: "👓", Dentiste: "🦷", Médecin: "🩺",
  Fleuriste: "💐", Librairie: "📚",
  Cadeaux: "🎁", Vêtements: "👗",
};

export function RestaurantCard({ restaurant, compact = false }: { restaurant: Restaurant; compact?: boolean }) {
  const { t } = useTranslation();
  const categoryEmoji = CATEGORY_EMOJIS[restaurant.category] || "🍽️";
  const imageHeight = compact ? "h-28" : "h-44";

  return (
    <Link href={`/restaurants/${restaurant.id}`} data-testid={`card-restaurant-${restaurant.id}`}>
      <div className="group bg-card rounded-2xl border border-card-border overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md hover:shadow-black/8 active:scale-[0.99]">
        {/* Image */}
        <div className={`relative ${imageHeight} bg-muted overflow-hidden`}>
          {restaurant.imageUrl ? (
            <img
              src={restaurant.imageUrl}
              alt={restaurant.name}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/15 via-primary/8 to-accent flex items-center justify-center">
              <span className={compact ? "text-3xl" : "text-5xl"}>{categoryEmoji}</span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

          {/* Badges top left */}
          <div className="absolute top-2 left-2 flex gap-1">
            {restaurant.isLocal && (
              <Badge className="bg-primary hover:bg-primary text-primary-foreground text-[10px] gap-1 font-bold shadow-sm px-1.5 py-0.5" data-testid={`badge-local-${restaurant.id}`}>
                <Award className="w-2.5 h-2.5" />
                {t("card.local")}
              </Badge>
            )}
            {!restaurant.isOpen && (
              <Badge variant="secondary" className="text-[10px] bg-black/60 hover:bg-black/60 text-white border-0 px-1.5 py-0.5">{t("card.closed")}</Badge>
            )}
          </div>

          {/* Delivery time pill bottom left */}
          {restaurant.deliveryTime && (
            <div className="absolute bottom-2 left-2">
              <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                <Zap className="w-2.5 h-2.5" />
                {restaurant.deliveryTime} min
              </span>
            </div>
          )}

          {/* Rating bottom right */}
          {restaurant.rating && (
            <div
              className="absolute bottom-2 right-2 flex items-center gap-0.5 bg-white/95 dark:bg-black/70 backdrop-blur-sm rounded-full px-1.5 py-0.5 shadow-sm"
              data-testid={`text-rating-${restaurant.id}`}
            >
              <Star className="w-2.5 h-2.5 fill-brand-yellow text-brand-yellow" />
              <span className="text-[10px] font-bold text-foreground">{restaurant.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className={compact ? "p-2.5" : "p-3.5"}>
          <h3 className={`font-semibold text-foreground leading-snug truncate ${compact ? "text-sm" : "text-base"}`} data-testid={`text-restaurant-name-${restaurant.id}`}>
            {restaurant.name}
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{restaurant.category}</p>

          {!compact && (
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-2">
              {restaurant.deliveryFee !== null && restaurant.deliveryFee !== undefined && (
                <span className="flex items-center gap-1">
                  <Truck className={`w-3 h-3 ${restaurant.deliveryFee === 0 ? "text-brand-turquoise" : "text-primary/70"}`} />
                  <span className={`font-medium ${restaurant.deliveryFee === 0 ? "text-brand-turquoise" : "text-foreground"}`}>
                    {restaurant.deliveryFee === 0 ? t("card.freeDelivery") : `${restaurant.deliveryFee} MAD`}
                  </span>
                </span>
              )}
              {restaurant.reviewCount > 0 && (
                <span className="ml-auto">{t("card.review", { count: restaurant.reviewCount })}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

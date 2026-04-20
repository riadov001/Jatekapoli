import { Link } from "wouter";
import { Star, Truck, Award, Zap } from "lucide-react";
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

// Deterministic vibrant gradient per restaurant for the logo avatar.
function logoGradient(seed: string) {
  const palettes = [
    "from-rose-400 to-orange-500",
    "from-amber-400 to-pink-500",
    "from-emerald-400 to-teal-500",
    "from-sky-400 to-indigo-500",
    "from-fuchsia-400 to-purple-500",
    "from-lime-400 to-emerald-500",
    "from-orange-400 to-red-500",
    "from-cyan-400 to-blue-500",
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palettes[h % palettes.length];
}

export function RestaurantCard({ restaurant, compact = false }: { restaurant: Restaurant; compact?: boolean }) {
  const { t } = useTranslation();
  const categoryEmoji = CATEGORY_EMOJIS[restaurant.category] || "🍽️";
  const imageHeight = compact ? "h-40" : "h-56";
  const initial = restaurant.name?.charAt(0).toUpperCase() ?? "?";

  return (
    <Link href={`/restaurants/${restaurant.id}`} data-testid={`card-restaurant-${restaurant.id}`}>
      <div className="group relative bg-card rounded-3xl overflow-visible cursor-pointer transition-all duration-300 hover:-translate-y-0.5">
        {/* Image (rounded, no border) */}
        <div className={`relative ${imageHeight} bg-muted overflow-hidden rounded-3xl shadow-md shadow-black/10`}>
          {restaurant.imageUrl ? (
            <img
              src={restaurant.imageUrl}
              alt={restaurant.name}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-accent flex items-center justify-center">
              <span className={compact ? "text-5xl" : "text-7xl"}>{categoryEmoji}</span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-transparent" />

          {/* Badges top left */}
          <div className="absolute top-2.5 left-2.5 flex gap-1">
            {restaurant.isLocal && (
              <Badge className="bg-primary hover:bg-primary text-primary-foreground text-[10px] gap-1 font-bold shadow-sm px-2 py-0.5" data-testid={`badge-local-${restaurant.id}`}>
                <Award className="w-2.5 h-2.5" />
                {t("card.local")}
              </Badge>
            )}
            {!restaurant.isOpen && (
              <Badge variant="secondary" className="text-[10px] bg-black/60 hover:bg-black/60 text-white border-0 px-2 py-0.5">{t("card.closed")}</Badge>
            )}
          </div>

          {/* Delivery time pill bottom right */}
          {restaurant.deliveryTime && (
            <div className="absolute top-2.5 right-2.5">
              <span className="inline-flex items-center gap-1 bg-white/95 dark:bg-black/70 backdrop-blur-sm text-foreground text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                <Zap className="w-2.5 h-2.5 text-primary fill-primary" />
                {restaurant.deliveryTime} min
              </span>
            </div>
          )}

          {/* Rating bottom left */}
          {restaurant.rating && (
            <div
              className="absolute bottom-2.5 right-2.5 flex items-center gap-0.5 bg-white/95 dark:bg-black/70 backdrop-blur-sm rounded-full px-2 py-0.5 shadow-sm"
              data-testid={`text-rating-${restaurant.id}`}
            >
              <Star className="w-3 h-3 fill-brand-yellow text-brand-yellow" />
              <span className="text-[11px] font-bold text-foreground">{restaurant.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Logo straddling image / content boundary */}
        <div className="relative">
          <div
            className={`absolute -top-7 left-3 w-14 h-14 rounded-2xl ring-4 ring-card overflow-hidden shadow-lg shadow-black/20 bg-gradient-to-br ${logoGradient(
              restaurant.name + restaurant.id,
            )} flex items-center justify-center text-white font-display font-extrabold text-xl`}
          >
            <span className="drop-shadow">{initial}</span>
          </div>
        </div>

        {/* Content */}
        <div className={`pt-9 ${compact ? "px-2 pb-2" : "px-3 pb-3"}`}>
          <h3 className={`font-semibold text-foreground leading-snug truncate ${compact ? "text-sm" : "text-base"}`} data-testid={`text-restaurant-name-${restaurant.id}`}>
            {restaurant.name}
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {categoryEmoji} {restaurant.category}
          </p>

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

import { Link } from "wouter";
import { Star, Clock, Truck, Award } from "lucide-react";
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

export function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <Link href={`/restaurants/${restaurant.id}`} data-testid={`card-restaurant-${restaurant.id}`}>
      <div className="group bg-card rounded-2xl border border-card-border overflow-hidden hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer">
        {/* Image */}
        <div className="relative h-44 bg-muted overflow-hidden">
          {restaurant.imageUrl ? (
            <img
              src={restaurant.imageUrl}
              alt={restaurant.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <span className="text-4xl">🍽</span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            {restaurant.isLocal && (
              <Badge className="bg-green-500 text-white text-xs gap-1 font-semibold shadow-md" data-testid={`badge-local-${restaurant.id}`}>
                <Award className="w-3 h-3" />
                Support Local
              </Badge>
            )}
            {!restaurant.isOpen && (
              <Badge variant="secondary" className="text-xs">Closed</Badge>
            )}
          </div>

          {/* Category badge */}
          <div className="absolute top-3 right-3">
            <Badge variant="secondary" className="text-xs bg-black/50 text-white border-0">
              {restaurant.category}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-semibold text-base text-foreground leading-tight" data-testid={`text-restaurant-name-${restaurant.id}`}>
              {restaurant.name}
            </h3>
            {restaurant.rating && (
              <div className="flex items-center gap-1 shrink-0" data-testid={`text-rating-${restaurant.id}`}>
                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-semibold">{restaurant.rating.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">({restaurant.reviewCount})</span>
              </div>
            )}
          </div>

          {restaurant.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{restaurant.description}</p>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {restaurant.deliveryTime && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {restaurant.deliveryTime} min
              </span>
            )}
            {restaurant.deliveryFee !== null && restaurant.deliveryFee !== undefined && (
              <span className="flex items-center gap-1">
                <Truck className="w-3.5 h-3.5" />
                {restaurant.deliveryFee === 0 ? "Free delivery" : `${restaurant.deliveryFee} MAD`}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

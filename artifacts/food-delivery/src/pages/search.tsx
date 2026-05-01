import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { Search, ArrowLeft, MapPin, Clock, Star, Truck, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useListRestaurants, useListMenuItems } from "@workspace/api-client-react";
import { useTranslation } from "react-i18next";
import { useDebounce } from "@/hooks/use-debounce";

const FILTERS = [
  { id: "all", label: "Tout" },
  { id: "open", label: "Ouvert" },
  { id: "free_delivery", label: "Livraison gratuite" },
  { id: "top_rated", label: "Mieux notés" },
];

function RestaurantSearchCard({ restaurant }: { restaurant: any }) {
  const [_, setLocation] = useLocation();
  return (
    <button
      onClick={() => setLocation(`/restaurants/${restaurant.id}`)}
      className="w-full flex items-center gap-4 p-3 rounded-2xl bg-card hover:shadow-md hover:shadow-black/5 transition-all border border-card-border text-left"
    >
      <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0">
        {restaurant.imageUrl ? (
          <img src={restaurant.imageUrl} alt={restaurant.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">🍽</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-sm truncate">{restaurant.name}</span>
          {!restaurant.isOpen && (
            <Badge variant="destructive" className="text-[10px] shrink-0">Fermé</Badge>
          )}
        </div>
        {restaurant.category && (
          <p className="text-xs text-muted-foreground truncate">{restaurant.category}</p>
        )}
        <div className="flex items-center gap-3 mt-1">
          {restaurant.rating && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              {restaurant.rating.toFixed(1)}
            </span>
          )}
          {restaurant.deliveryTime && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {restaurant.deliveryTime} min
            </span>
          )}
          {restaurant.deliveryFee !== null && restaurant.deliveryFee !== undefined && (
            <span className={`flex items-center gap-1 text-xs ${restaurant.deliveryFee === 0 ? "text-brand-turquoise font-semibold" : "text-muted-foreground"}`}>
              <Truck className="w-3 h-3" />
              {restaurant.deliveryFee === 0 ? "Offerte" : `${restaurant.deliveryFee} MAD`}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function SearchPage() {
  const [_, setLocation] = useLocation();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const debouncedQuery = useDebounce(query, 300);

  const params: any = {};
  if (debouncedQuery) params.search = debouncedQuery;
  if (activeFilter === "open") params.isOpen = true;

  const { data: restaurants, isLoading } = useListRestaurants(params, {
    query: { enabled: true },
  });

  const filtered = (restaurants ?? []).filter((r) => {
    if (activeFilter === "free_delivery") return r.deliveryFee === 0 || r.deliveryFee === null;
    if (activeFilter === "top_rated") return (r.rating ?? 0) >= 4;
    return true;
  });

  const open = filtered.filter((r) => r.isOpen);
  const closed = filtered.filter((r) => !r.isOpen);
  const sorted = [...open, ...closed];

  return (
    <div className="space-y-4 pb-24">
      {/* Search header */}
      <div className="flex items-center gap-3 sticky top-0 bg-background/95 backdrop-blur z-10 -mx-4 px-4 py-3 border-b border-border/50">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-9 w-9"
          onClick={() => setLocation("/")}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Restaurants, plats, cuisines..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 h-10 rounded-xl"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`shrink-0 px-3.5 h-8 rounded-full text-xs font-semibold transition-all ${
              activeFilter === f.id
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-card-border text-foreground hover:bg-muted"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {!debouncedQuery ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-base mb-1">Recherchez un restaurant</h3>
          <p className="text-sm text-muted-foreground">Tapez le nom d'un restaurant, d'un plat ou d'une cuisine</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-2xl border border-card-border">
              <Skeleton className="w-16 h-16 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 text-3xl">
            🔍
          </div>
          <h3 className="font-semibold text-base mb-1">Aucun résultat</h3>
          <p className="text-sm text-muted-foreground">
            Aucun restaurant ne correspond à « {debouncedQuery} »
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => { setQuery(""); setActiveFilter("all"); }}
          >
            Réinitialiser la recherche
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {sorted.length} résultat{sorted.length !== 1 ? "s" : ""} pour « {debouncedQuery} »
          </p>
          {sorted.map((r) => (
            <RestaurantSearchCard key={r.id} restaurant={r} />
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import { Search, Award, ChevronRight, Flame } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useListRestaurants, useGetFeaturedRestaurants } from "@workspace/api-client-react";
import { RestaurantCard } from "@/components/RestaurantCard";

const CATEGORIES = ["All", "Moroccan", "Pizza", "Burgers", "Sushi", "Sandwiches", "Chicken"];

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [_, setLocation] = useLocation();

  const { data: featured, isLoading: featuredLoading } = useGetFeaturedRestaurants();
  const { data: restaurants, isLoading } = useListRestaurants({
    ...(activeCategory !== "All" ? { category: activeCategory } : {}),
    ...(search ? { search } : {}),
  });

  const localRestaurants = restaurants?.filter((r) => r.isLocal) ?? [];

  return (
    <div className="space-y-10 pb-20 sm:pb-6">
      {/* Hero */}
      <div className="relative rounded-3xl bg-gradient-to-br from-primary via-orange-500 to-amber-500 p-8 sm:p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-8 text-8xl">🥘</div>
          <div className="absolute bottom-4 right-32 text-5xl">🍕</div>
          <div className="absolute top-8 right-48 text-6xl">🍔</div>
        </div>
        <div className="relative max-w-lg">
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-white mb-2 leading-tight">
            Food delivered fast in Oujda
          </h1>
          <p className="text-white/80 text-sm sm:text-base mb-6">
            From your favorite local spots to popular chains — all in one tap.
          </p>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search restaurants or dishes..."
              className="pl-10 h-12 bg-white/95 border-0 shadow-lg text-foreground placeholder:text-muted-foreground text-sm rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search"
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              size="sm"
              className={`shrink-0 rounded-full px-4 h-9 text-sm transition-all ${activeCategory === cat ? "" : "hover:bg-accent"}`}
              onClick={() => setActiveCategory(cat)}
              data-testid={`button-category-${cat.toLowerCase()}`}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Support Local Section */}
      {localRestaurants.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Award className="w-4 h-4 text-green-600" />
              </div>
              <h2 className="font-display font-bold text-xl text-foreground">Support Local</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/restaurants?isLocal=true")} className="text-primary">
              See all <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Real Oujda flavors from family-run restaurants</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {localRestaurants.slice(0, 3).map((r) => (
              <RestaurantCard key={r.id} restaurant={r} />
            ))}
          </div>
        </section>
      )}

      {/* Featured / All Restaurants */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <Flame className="w-4 h-4 text-primary" />
          </div>
          <h2 className="font-display font-bold text-xl text-foreground">
            {search || activeCategory !== "All" ? "Search Results" : "All Restaurants"}
          </h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden border border-card-border">
                <Skeleton className="h-44 w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : restaurants?.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium">No restaurants found</p>
            <p className="text-sm mt-1">Try adjusting your search or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {restaurants?.map((r) => (
              <RestaurantCard key={r.id} restaurant={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

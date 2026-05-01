import { useEffect, useState } from "react";
import { Search, ArrowLeft, X } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useListRestaurants } from "@workspace/api-client-react";
import { RestaurantCard } from "@/components/RestaurantCard";

function CardSkeleton() {
  return (
    <div className="rounded-3xl overflow-hidden bg-card">
      <Skeleton className="h-44 w-full rounded-3xl" />
      <div className="p-3 pt-7 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export default function SearchPage() {
  const initialQuery = new URLSearchParams(window.location.search).get("q") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const url = debouncedQuery ? `/search?q=${encodeURIComponent(debouncedQuery)}` : "/search";
    window.history.replaceState(null, "", url);
  }, [debouncedQuery]);

  const { data: results, isLoading } = useListRestaurants(
    debouncedQuery ? { search: debouncedQuery } : undefined
  );

  return (
    <div className="space-y-6 pb-24">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 rounded-xl"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Rechercher un restaurant, une cuisine..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 pr-10 h-11 rounded-2xl bg-card border-border"
          />
          {query && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setQuery("")}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      {!isLoading && debouncedQuery && (
        <p className="text-sm text-muted-foreground">
          {results?.length
            ? `${results.length} résultat${results.length > 1 ? "s" : ""} pour « ${debouncedQuery} »`
            : `Aucun résultat pour « ${debouncedQuery} »`}
        </p>
      )}

      {/* Empty state when no query */}
      {!debouncedQuery && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🔍</div>
          <p className="font-semibold text-base">Cherchez un restaurant</p>
          <p className="text-sm text-muted-foreground mt-1">Tapez le nom d'un restaurant ou d'une cuisine</p>
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && debouncedQuery && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-8">
          {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      )}

      {/* Results grid */}
      {!isLoading && results && results.length > 0 && (
        <motion.div
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-10"
        >
          {results.map((r) => (
            <motion.div
              key={r.id}
              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } } }}
            >
              <RestaurantCard restaurant={r} compact />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* No results state */}
      {!isLoading && debouncedQuery && results?.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">😕</div>
          <p className="font-semibold">Aucun résultat</p>
          <p className="text-sm text-muted-foreground mt-1">Essayez un autre terme de recherche</p>
          <Button variant="outline" className="mt-4 rounded-xl" onClick={() => setQuery("")}>
            Effacer la recherche
          </Button>
        </div>
      )}
    </div>
  );
}

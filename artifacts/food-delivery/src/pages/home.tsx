import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Search, ChevronRight, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useListRestaurants } from "@workspace/api-client-react";
import { RestaurantCard } from "@/components/RestaurantCard";
import { useTranslation } from "react-i18next";

const TOP_CATEGORIES = [
  { id: "restaurant", label: "Restaurants", emoji: "🍽️" },
  { id: "grocery", label: "Courses", emoji: "🛒" },
  { id: "health", label: "Santé", emoji: "💊" },
  { id: "other", label: "Autres", emoji: "📦" },
] as const;

type TopCatId = typeof TOP_CATEGORIES[number]["id"];

const SUBCATEGORIES: Record<TopCatId, string[]> = {
  restaurant: ["Tous", "Halal", "Pizza", "Burger", "Sushi", "Marocain", "Sandwichs", "Poulet", "Végé"],
  grocery: ["Tous", "Épicerie", "Grande surface", "Bio", "Primeur", "Caviste"],
  health: ["Tous", "Pharmacie", "Parapharmacie", "Optique", "Dentiste", "Médecin"],
  other: ["Tous", "Fleuriste", "Librairie", "Cadeaux", "Vêtements"],
};

function CardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border border-card-border bg-card">
      <Skeleton className="h-32 w-full" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-2 pt-0.5">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

function FeaturedBanner({ businesses }: { businesses: any[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!businesses.length) return;
    const el = scrollRef.current;
    if (!el) return;
    let frame: number;
    let pos = 0;
    const speed = 0.4;
    const animate = () => {
      pos += speed;
      if (pos >= el.scrollWidth / 2) pos = 0;
      el.scrollLeft = pos;
      frame = requestAnimationFrame(animate);
    };
    const timerId = setTimeout(() => { frame = requestAnimationFrame(animate); }, 800);
    const stop = () => cancelAnimationFrame(frame);
    el.addEventListener("mouseenter", stop);
    el.addEventListener("touchstart", stop, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timerId);
      el.removeEventListener("mouseenter", stop);
      el.removeEventListener("touchstart", stop);
    };
  }, [businesses.length]);

  if (!businesses.length) return null;

  const doubled = [...businesses, ...businesses];

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary fill-primary" />
          <h2 className="font-display font-bold text-base text-foreground">À la une</h2>
        </div>
        <Button variant="ghost" size="sm" className="text-primary text-xs gap-1 h-7 px-2" onClick={() => setLocation("/restaurants")}>
          Voir tout <ChevronRight className="w-3 h-3" />
        </Button>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-1"
        style={{ scrollbarWidth: "none" }}
      >
        {doubled.map((r, i) => (
          <button
            key={`${r.id}-${i}`}
            onClick={() => setLocation(`/restaurants/${r.id}`)}
            className="shrink-0 w-56 rounded-2xl overflow-hidden border border-card-border bg-card text-left hover:shadow-md hover:shadow-primary/10 transition-shadow"
          >
            <div className="h-28 bg-muted relative overflow-hidden">
              {r.imageUrl ? (
                <img src={r.imageUrl} alt={r.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl">
                  {r.category === "Pizza" ? "🍕" : r.category === "Burgers" ? "🍔" : r.category === "Sushi" ? "🍣" : "🍽️"}
                </div>
              )}
              <div className="absolute bottom-2 left-2">
                <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                  <Zap className="w-3 h-3" />
                  {r.deliveryTime ?? 25} min
                </span>
              </div>
            </div>
            <div className="p-3">
              <p className="font-semibold text-sm leading-tight truncate">{r.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{r.category}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [activeTop, setActiveTop] = useState<TopCatId>("restaurant");
  const [activeSub, setActiveSub] = useState("Tous");
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  const subs = SUBCATEGORIES[activeTop];

  useEffect(() => { setActiveSub("Tous"); }, [activeTop]);

  const listParams = useMemo(() => {
    const p: Record<string, string | boolean> = { businessType: activeTop };
    if (activeSub !== "Tous") p.category = activeSub;
    if (search) p.search = search;
    return p;
  }, [activeTop, activeSub, search]);

  const { data: businesses, isLoading } = useListRestaurants(listParams as any);
  const { data: allFeatured } = useListRestaurants({});
  const featured = useMemo(() => (allFeatured ?? []).filter((r) => r.isVerified || r.rating != null), [allFeatured]);

  return (
    <div className="space-y-6 pb-24 sm:pb-8">

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={t("home.search")}
          className="pl-10 h-12 bg-card border-card-border text-foreground placeholder:text-muted-foreground text-sm rounded-2xl shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="input-search"
        />
      </div>

      {/* Top category tabs – Flink circle icon style */}
      <div className="grid grid-cols-4 gap-2">
        {TOP_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveTop(cat.id)}
            className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border transition-all duration-200 ${
              activeTop === cat.id
                ? "border-primary bg-accent shadow-sm shadow-primary/15"
                : "border-card-border bg-card hover:border-primary/30"
            }`}
            data-testid={`btn-top-cat-${cat.id}`}
          >
            <span className="text-2xl">{cat.emoji}</span>
            <span className={`text-xs font-semibold leading-none ${activeTop === cat.id ? "text-primary" : "text-foreground"}`}>
              {cat.label}
            </span>
          </button>
        ))}
      </div>

      {/* Subcategory horizontal scroll */}
      {!search && (
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
          {subs.map((sub) => (
            <button
              key={sub}
              onClick={() => setActiveSub(sub)}
              className={`shrink-0 px-3 h-8 rounded-full text-xs font-semibold transition-all border ${
                activeSub === sub
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-card-border hover:border-primary/40"
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      )}

      {/* Featured scrolling banner */}
      {!search && activeSub === "Tous" && <FeaturedBanner businesses={featured.slice(0, 8)} />}

      {/* Business grid */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-base text-foreground">
            {search
              ? t("home.resultsFor", { search })
              : activeSub !== "Tous"
              ? activeSub
              : TOP_CATEGORIES.find((c) => c.id === activeTop)?.label ?? ""}
          </h2>
          {businesses && businesses.length > 0 && (
            <span className="text-xs text-muted-foreground">{businesses.length} résultat{businesses.length > 1 ? "s" : ""}</span>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : businesses?.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-base font-semibold">{t("home.noRestaurantsFound")}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("home.tryDifferent")}</p>
            <Button variant="outline" className="mt-4 rounded-xl" onClick={() => { setSearch(""); setActiveSub("Tous"); }}>
              {t("home.clearFilters")}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {businesses?.map((r) => (
              <motion.div key={r.id} variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } }}>
                <RestaurantCard restaurant={r} compact />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>
    </div>
  );
}

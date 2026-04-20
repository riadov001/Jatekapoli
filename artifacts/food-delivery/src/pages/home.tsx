import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  { id: "restaurant", label: "Restaurants", emoji: "🍽️", bg: "from-orange-100 to-rose-100", ring: "ring-orange-300" },
  { id: "grocery", label: "Courses", emoji: "🛒", bg: "from-amber-100 to-yellow-100", ring: "ring-amber-300" },
  { id: "health", label: "Santé", emoji: "💊", bg: "from-emerald-100 to-teal-100", ring: "ring-emerald-300" },
  { id: "other", label: "Cadeaux", emoji: "🎁", bg: "from-fuchsia-100 to-pink-100", ring: "ring-fuchsia-300" },
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
    <div className="rounded-3xl overflow-hidden bg-card">
      <Skeleton className="h-44 w-full rounded-3xl" />
      <div className="p-3 pt-7 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
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
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
        style={{ scrollbarWidth: "none" }}
      >
        {doubled.map((r, i) => (
          <button
            key={`${r.id}-${i}`}
            onClick={() => setLocation(`/restaurants/${r.id}`)}
            className="shrink-0 w-64 rounded-3xl overflow-hidden bg-card text-left transition-transform hover:-translate-y-0.5 shadow-md shadow-black/10"
          >
            <div className="h-36 bg-muted relative overflow-hidden">
              {r.imageUrl ? (
                <img src={r.imageUrl} alt={r.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl">
                  {r.category === "Pizza" ? "🍕" : r.category === "Burgers" ? "🍔" : r.category === "Sushi" ? "🍣" : "🍽️"}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-2 left-2">
                <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                  <Zap className="w-3 h-3" />
                  {r.deliveryTime ?? 25} min
                </span>
              </div>
              <div className="absolute top-2 right-2">
                <span className="inline-flex items-center bg-brand-yellow text-brand-yellow-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  -15%
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
  const [searchSlot, setSearchSlot] = useState<HTMLElement | null>(null);

  // Bind search input into the sticky header slot.
  useEffect(() => {
    setSearchSlot(document.getElementById("header-search-slot"));
  }, []);

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

  const searchInput = (
    <div className="relative w-full">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        placeholder={t("home.search")}
        aria-label={t("home.search")}
        className="pl-10 h-11 bg-white/85 dark:bg-black/30 border-transparent focus-visible:ring-primary/40 text-foreground placeholder:text-muted-foreground text-sm rounded-2xl shadow-sm"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        data-testid="input-search"
      />
    </div>
  );

  return (
    <div className="space-y-7 pb-24 sm:pb-8">
      {/* Search bar — rendered into sticky header slot when available, otherwise inline. */}
      {searchSlot ? createPortal(searchInput, searchSlot) : searchInput}

      {/* Top category tiles — 2 rows × 2 cols (sophisticated large tiles) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {TOP_CATEGORIES.map((cat) => {
          const active = activeTop === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveTop(cat.id)}
              className={`relative flex items-center justify-between p-4 sm:p-5 h-24 sm:h-28 rounded-3xl overflow-hidden transition-all duration-200 bg-gradient-to-br ${cat.bg} dark:opacity-90 ${
                active
                  ? `ring-2 ${cat.ring} shadow-lg shadow-black/10 scale-[1.01]`
                  : "ring-1 ring-black/5 hover:scale-[1.01]"
              }`}
              data-testid={`btn-top-cat-${cat.id}`}
            >
              <span className="text-sm sm:text-base font-bold leading-tight text-foreground text-left">
                {cat.label}
              </span>
              <span className="text-4xl sm:text-5xl leading-none drop-shadow-sm">{cat.emoji}</span>
            </button>
          );
        })}
      </div>

      {/* Promo banner — yellow Talabat accent */}
      <div className="relative flex items-center gap-3 rounded-3xl overflow-hidden bg-brand-yellow text-brand-yellow-foreground p-4 sm:p-5 shadow-md shadow-brand-yellow/30">
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-lg sm:text-xl leading-tight">
            1ère commande offerte 🎉
          </p>
          <p className="text-xs sm:text-sm opacity-80 mt-1">
            Code <span className="font-bold">JATEK10</span> — livraison gratuite
          </p>
          <Button
            size="sm"
            className="mt-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-8 px-4"
            onClick={() => setActiveSub("Tous")}
          >
            Commander
          </Button>
        </div>
        <span className="text-5xl sm:text-6xl shrink-0">🛍️</span>
      </div>

      {/* Subcategory horizontal scroll */}
      {!search && (
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
          {subs.map((sub) => (
            <button
              key={sub}
              onClick={() => setActiveSub(sub)}
              className={`shrink-0 px-3.5 h-9 rounded-full text-xs font-semibold transition-all ${
                activeSub === sub
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                  : "bg-card text-foreground hover:bg-muted"
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg text-foreground">
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
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-8">
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
            className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-10"
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

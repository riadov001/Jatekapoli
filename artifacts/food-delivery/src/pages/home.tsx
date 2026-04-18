import { useState } from "react";
import { useLocation } from "wouter";
import { Search, Award, ChevronRight, Flame, Sparkles, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useListRestaurants } from "@workspace/api-client-react";
import { RestaurantCard } from "@/components/RestaurantCard";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

const CATEGORIES = [
  { id: "All", emoji: "🍽️" },
  { id: "Moroccan", emoji: "🥘" },
  { id: "Pizza", emoji: "🍕" },
  { id: "Burgers", emoji: "🍔" },
  { id: "Sushi", emoji: "🍣" },
  { id: "Sandwiches", emoji: "🥙" },
  { id: "Chicken", emoji: "🍗" },
];

const FOOD_EMOJIS = ["🥘", "🍕", "🍔", "🥙", "🍗"];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

function RestaurantSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border border-card-border bg-card">
      <Skeleton className="h-44 w-full" />
      <div className="p-4 space-y-2.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-3 pt-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [_, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();

  const { data: restaurants, isLoading } = useListRestaurants({
    ...(activeCategory !== "All" ? { category: activeCategory } : {}),
    ...(search ? { search } : {}),
  });

  const localRestaurants = restaurants?.filter((r) => r.isLocal) ?? [];

  return (
    <div className="space-y-8 pb-24 sm:pb-8">

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative rounded-3xl overflow-hidden"
        style={{ background: "linear-gradient(135deg, #EA580C 0%, #F97316 45%, #FB923C 70%, #FDBA74 100%)" }}
      >
        {/* Decorative food emojis */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {FOOD_EMOJIS.map((emoji, i) => (
            <motion.span
              key={i}
              className="absolute text-5xl opacity-15 select-none"
              style={{
                top: `${[8, 60, 15, 50, 30][i]}%`,
                right: `${[4, 20, 38, 55, 70][i]}%`,
              }}
              animate={{ y: [0, -8, 0], rotate: [0, i % 2 === 0 ? 5 : -5, 0] }}
              transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.4 }}
            >
              {emoji}
            </motion.span>
          ))}
        </div>

        <div className="relative px-6 py-8 sm:px-10 sm:py-12">
          {isAuthenticated && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-white/90 text-xs font-medium mb-3"
            >
              <MapPin className="w-3 h-3" />
              Oujda, Maroc
            </motion.div>
          )}

          <h1 className="font-display font-bold text-3xl sm:text-4xl text-white mb-2 leading-tight max-w-sm">
            {isAuthenticated && user?.name
              ? t("home.hungry", { name: user.name.split(" ")[0] })
              : t("home.orderFast")}
          </h1>
          <p className="text-white/80 text-sm sm:text-base mb-6 max-w-xs">
            {t("home.tagline")}
          </p>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("home.search")}
              className="pl-10 h-12 bg-white/95 border-0 shadow-lg text-foreground placeholder:text-muted-foreground text-sm rounded-2xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search"
            />
          </div>
        </div>
      </motion.div>

      {/* Category Pills */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1"
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-1.5 shrink-0 px-4 h-10 rounded-full text-sm font-medium transition-all duration-200 border ${
              activeCategory === cat.id
                ? "bg-primary text-white border-primary shadow-md shadow-primary/25"
                : "bg-card text-foreground border-card-border hover:border-primary/40 hover:bg-accent"
            }`}
            data-testid={`button-category-${cat.id.toLowerCase()}`}
          >
            <span>{cat.emoji}</span>
            <span>{cat.id}</span>
          </button>
        ))}
      </motion.div>

      {/* Support Local Section */}
      {!search && !isLoading && localRestaurants.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Award className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg text-foreground leading-none">{t("home.supportLocal")}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{t("home.realOujdaFlavors")}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/restaurants?isLocal=true")}
              className="text-primary text-sm gap-1 h-8"
            >
              {t("home.seeAll")} <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {localRestaurants.slice(0, 3).map((r) => (
              <motion.div key={r.id} variants={itemVariants}>
                <RestaurantCard restaurant={r} />
              </motion.div>
            ))}
          </motion.div>
        </motion.section>
      )}

      {/* All / Featured Restaurants */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            {search || activeCategory !== "All" ? (
              <Sparkles className="w-4 h-4 text-primary" />
            ) : (
              <Flame className="w-4 h-4 text-primary" />
            )}
          </div>
          <h2 className="font-display font-bold text-lg text-foreground">
            {search
              ? t("home.resultsFor", { search })
              : activeCategory !== "All"
              ? t("home.categoryRestaurants", { category: activeCategory })
              : t("home.allRestaurants")}
          </h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <RestaurantSkeleton key={i} />)}
          </div>
        ) : restaurants?.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-lg font-semibold">{t("home.noRestaurantsFound")}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("home.tryDifferent")}</p>
            <Button
              variant="outline"
              className="mt-4 rounded-xl"
              onClick={() => { setSearch(""); setActiveCategory("All"); }}
            >
              {t("home.clearFilters")}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {restaurants?.map((r) => (
              <motion.div key={r.id} variants={itemVariants}>
                <RestaurantCard restaurant={r} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>
    </div>
  );
}

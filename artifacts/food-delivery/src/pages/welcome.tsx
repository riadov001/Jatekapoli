import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Zap, MapPin, ShoppingBag, Truck, ChevronRight, Star, Clock } from "lucide-react";
import { useListRestaurants } from "@workspace/api-client-react";

const TOP_CATEGORIES = [
  { id: "restaurant", label: "Restaurants", emoji: "🍽️", desc: "Plats prêts à savourer" },
  { id: "grocery", label: "Courses", emoji: "🛒", desc: "Épicerie & supermarché" },
  { id: "health", label: "Santé", emoji: "💊", desc: "Pharmacie & bien-être" },
  { id: "other", label: "Autres", emoji: "📦", desc: "Fleurs, cadeaux & plus" },
];

const STEPS = [
  { icon: MapPin, title: "1. Choisis ton adresse", desc: "On te montre les commerces qui livrent chez toi" },
  { icon: ShoppingBag, title: "2. Compose ta commande", desc: "Ajoute tes produits préférés en quelques clics" },
  { icon: Truck, title: "3. Reçois en un éclair", desc: "Livraison express suivie en temps réel" },
];

export default function WelcomePage() {
  const [, setLocation] = useLocation();
  const { data: restaurants } = useListRestaurants();
  const featured = (restaurants ?? []).slice(0, 8);

  const visit = (to: string) => {
    localStorage.setItem("jatek_visited", "1");
    setLocation(to);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* HERO */}
      <section
        className="relative px-6 pt-12 pb-20 overflow-hidden"
        style={{ background: "linear-gradient(160deg, #B0004F 0%, #E2006A 45%, #FF1A85 80%, #FF66AC 100%)" }}
      >
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2 mb-10"
        >
          <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="font-display font-bold italic text-2xl text-white tracking-tight">Jatek.</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-xl"
        >
          <h1 className="font-display font-bold text-4xl sm:text-5xl text-white leading-tight">
            Livraison express<br />à votre porte
          </h1>
          <p className="text-white/85 text-base sm:text-lg mt-4 max-w-md">
            Restaurants, courses, pharmacies — tout livré en un éclair à Oujda et bientôt partout au Maroc.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-7 max-w-md">
            <Button
              size="lg"
              className="h-13 sm:flex-1 text-base font-bold rounded-2xl bg-white text-primary hover:bg-white/95 shadow-lg"
              onClick={() => visit("/register")}
            >
              Commencer
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-13 sm:flex-1 text-base font-bold rounded-2xl bg-white/15 border-white/40 text-white hover:bg-white/25 backdrop-blur-sm"
              onClick={() => visit("/login")}
            >
              Se connecter
            </Button>
          </div>
          <button
            onClick={() => visit("/")}
            className="mt-4 text-sm font-medium text-white/80 hover:text-white underline underline-offset-4"
          >
            Continuer comme invité →
          </button>
        </motion.div>

        {/* floating scooter */}
        <div className="hidden md:block absolute right-10 bottom-8 text-9xl select-none opacity-90">🛵</div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section className="px-6 py-12 max-w-5xl mx-auto">
        <h2 className="font-display font-bold text-2xl sm:text-3xl text-foreground text-center mb-2">
          Comment ça marche ?
        </h2>
        <p className="text-muted-foreground text-center text-sm sm:text-base mb-8">
          3 étapes simples, livré en moins de 30 minutes
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="rounded-2xl border border-card-border bg-card p-5 text-center hover:shadow-md hover:shadow-primary/5 transition-shadow"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-3">
                <step.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display font-bold text-base text-foreground mb-1">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CATÉGORIES */}
      <section className="px-6 py-10 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-foreground mb-2">
            Que veux-tu te faire livrer ?
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base mb-6">
            Quatre univers, des centaines de commerces
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TOP_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => visit("/")}
                className="rounded-2xl border border-card-border bg-card p-5 text-left hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all"
              >
                <div className="text-3xl mb-2">{cat.emoji}</div>
                <div className="font-display font-bold text-base text-foreground">{cat.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{cat.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* COMMERCES À LA UNE */}
      {featured.length > 0 && (
        <section className="px-6 py-12 max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-foreground flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary fill-primary" />
                Commerces à la une
              </h2>
              <p className="text-muted-foreground text-sm mt-1">Les favoris des clients d'Oujda</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary gap-1"
              onClick={() => visit("/")}
            >
              Voir tout <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-6 px-6" style={{ scrollbarWidth: "none" }}>
            {featured.map((r) => (
              <button
                key={r.id}
                onClick={() => visit(`/restaurants/${r.id}`)}
                className="shrink-0 w-60 rounded-2xl overflow-hidden border border-card-border bg-card text-left hover:shadow-md hover:shadow-primary/10 transition-shadow"
              >
                <div className="h-32 bg-muted relative">
                  {r.imageUrl ? (
                    <img src={r.imageUrl} alt={r.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-4xl">🍽️</div>
                  )}
                  {r.deliveryTime && (
                    <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[11px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow">
                      <Zap className="w-3 h-3 fill-current" /> {r.deliveryTime} min
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm text-foreground truncate">{r.name}</h3>
                  {r.cuisineType && (
                    <p className="text-xs text-muted-foreground truncate">{r.cuisineType}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {r.rating && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        {r.rating.toFixed(1)}
                      </span>
                    )}
                    {r.deliveryTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {r.deliveryTime} min
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* CTA FINAL */}
      <section className="px-6 py-14 bg-muted/30">
        <div
          className="max-w-3xl mx-auto rounded-3xl px-8 py-10 sm:py-14 text-center text-white shadow-xl"
          style={{ background: "linear-gradient(135deg, #E2006A 0%, #FF1A85 60%, #FF66AC 100%)" }}
        >
          <h2 className="font-display font-bold text-3xl sm:text-4xl leading-tight">
            Prêt à commander ?
          </h2>
          <p className="text-white/85 text-base sm:text-lg mt-3 max-w-md mx-auto">
            Crée ton compte gratuit et profite de la livraison express dès maintenant.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-7 max-w-md mx-auto">
            <Button
              size="lg"
              className="h-13 sm:flex-1 text-base font-bold rounded-2xl bg-white text-primary hover:bg-white/95 shadow-lg"
              onClick={() => visit("/register")}
            >
              S'inscrire — c'est gratuit
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-13 sm:flex-1 text-base font-bold rounded-2xl bg-white/15 border-white/50 text-white hover:bg-white/25 backdrop-blur-sm"
              onClick={() => visit("/login")}
            >
              J'ai déjà un compte
            </Button>
          </div>
          <button
            onClick={() => visit("/")}
            className="mt-5 text-sm font-medium text-white/85 hover:text-white underline underline-offset-4"
          >
            Continuer comme invité
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 py-6 text-center text-xs text-muted-foreground border-t border-border">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button onClick={() => setLocation("/legal")} className="hover:text-foreground underline-offset-4 hover:underline">
            Mentions légales
          </button>
          <span>·</span>
          <button onClick={() => setLocation("/legal")} className="hover:text-foreground underline-offset-4 hover:underline">
            CGU
          </button>
          <span>·</span>
          <button onClick={() => setLocation("/legal")} className="hover:text-foreground underline-offset-4 hover:underline">
            RGPD
          </button>
        </div>
        <p className="mt-3">© {new Date().getFullYear()} Jatek — Livraison express à Oujda</p>
      </footer>
    </div>
  );
}

import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

export default function WelcomePage() {
  const [, setLocation] = useLocation();

  const continueAsGuest = () => {
    localStorage.setItem("tawsila_visited", "1");
    setLocation("/");
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between px-6 pt-20 pb-14"
      style={{ background: "linear-gradient(160deg, #B0004F 0%, #E2006A 40%, #FF1A85 75%, #FF66AC 100%)" }}
    >
      {/* Top – brand */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
          <Zap className="w-10 h-10 text-white fill-white" />
        </div>
        <div className="text-center">
          <h1 className="font-display font-bold text-4xl text-white tracking-tight">tawsila</h1>
          <p className="text-white/80 text-base mt-1">Ultra-fast delivery</p>
        </div>
      </motion.div>

      {/* Middle – illustration */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-center"
      >
        <div className="text-8xl mb-6 select-none">🛵</div>
        <h2 className="font-display font-bold text-2xl text-white leading-snug max-w-xs mx-auto">
          Livraison express à votre porte
        </h2>
        <p className="text-white/70 text-sm mt-2 max-w-xs mx-auto">
          Restaurants, courses, pharmacies — livrés en un éclair
        </p>
      </motion.div>

      {/* Bottom – CTA buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.45 }}
        className="w-full max-w-sm flex flex-col gap-3"
      >
        <Button
          size="lg"
          className="w-full h-14 text-base font-bold rounded-2xl bg-white text-primary hover:bg-white/90 shadow-lg"
          onClick={() => { localStorage.setItem("tawsila_visited", "1"); setLocation("/register"); }}
        >
          S'inscrire
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="w-full h-14 text-base font-bold rounded-2xl bg-white/15 border-white/40 text-white hover:bg-white/25 backdrop-blur-sm"
          onClick={() => { localStorage.setItem("tawsila_visited", "1"); setLocation("/login"); }}
        >
          Se connecter
        </Button>
        <button
          onClick={continueAsGuest}
          className="w-full h-11 text-sm font-medium text-white/80 hover:text-white transition-colors underline underline-offset-4"
        >
          Continuer comme invité
        </button>
      </motion.div>
    </div>
  );
}

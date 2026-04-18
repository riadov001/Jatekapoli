import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const [_, setLocation] = useLocation();
  const { t } = useTranslation();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="text-8xl mb-6">🍽️</div>
        <h1 className="font-display font-bold text-5xl text-primary mb-2">404</h1>
        <h2 className="font-display font-bold text-2xl mb-3">{t("notFound.title")}</h2>
        <p className="text-muted-foreground text-sm mb-8 max-w-xs">{t("notFound.desc")}</p>
        <Button
          className="gap-2 rounded-xl h-12 px-6 shadow-md shadow-primary/20"
          onClick={() => setLocation("/")}
        >
          <Home className="w-4 h-4" />
          {t("notFound.backHome")}
        </Button>
      </motion.div>
    </div>
  );
}

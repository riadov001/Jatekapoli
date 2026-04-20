import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, Home, UtensilsCrossed, Package, Gift, User, LogOut,
  ChevronDown, MapPin, Truck, LayoutDashboard, Store, Globe, FileText
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ReactNode, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface LayoutProps { children: ReactNode; }

export function Layout({ children }: LayoutProps) {
  const { user, logout, isAuthenticated } = useAuth();
  const { itemCount } = useCart();
  const [location, setLocation] = useLocation();
  const { t, i18n } = useTranslation();

  const isCustomer = !user?.role || user.role === "customer";
  const isRTL = i18n.language === "ar";

  useEffect(() => {
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = i18n.language;
  }, [i18n.language, isRTL]);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("jatek_lang", lng);
  };

  const BOTTOM_NAV = [
    { href: "/", icon: Home, label: t("nav.home") },
    { href: "/restaurants", icon: UtensilsCrossed, label: t("nav.browse") },
    { href: "/orders", icon: Package, label: t("nav.orders") },
    { href: "/rewards", icon: Gift, label: t("nav.rewards") },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <header className="sticky top-0 z-50 bg-background/85 backdrop-blur-xl border-b border-border/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-display font-extrabold text-xl text-primary shrink-0">
            <div className="w-9 h-9 bg-primary rounded-2xl flex items-center justify-center shadow-sm shadow-primary/30">
              <Truck className="text-white" style={{ width: "18px", height: "18px" }} />
            </div>
            <span className="tracking-tighter italic text-foreground">Jatek.</span>
          </Link>

          {/* Location pill */}
          <button className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors bg-secondary/60 hover:bg-secondary rounded-full px-3 py-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="font-medium">Oujda</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl w-10 h-10" title="Language">
                  <Globe className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 rounded-2xl p-1">
                <DropdownMenuItem
                  onClick={() => changeLanguage("en")}
                  className={`rounded-xl gap-2 py-2.5 ${i18n.language === "en" ? "font-bold text-primary" : ""}`}
                >
                  🇬🇧 {t("lang.en")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => changeLanguage("fr")}
                  className={`rounded-xl gap-2 py-2.5 ${i18n.language === "fr" ? "font-bold text-primary" : ""}`}
                >
                  🇫🇷 {t("lang.fr")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => changeLanguage("ar")}
                  className={`rounded-xl gap-2 py-2.5 ${i18n.language === "ar" ? "font-bold text-primary" : ""}`}
                >
                  🇲🇦 {t("lang.ar")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Cart button */}
            {isAuthenticated && isCustomer && (
              <Button
                variant="ghost"
                size="icon"
                className="relative rounded-xl w-10 h-10"
                onClick={() => setLocation("/cart")}
                data-testid="button-cart"
              >
                <ShoppingBag className="w-5 h-5" />
                <AnimatePresence>
                  {itemCount > 0 && (
                    <motion.div
                      key="badge"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-0.5 -right-0.5"
                    >
                      <Badge className="w-5 h-5 flex items-center justify-center p-0 text-[10px] font-bold bg-primary text-white rounded-full border-2 border-background">
                        {itemCount > 9 ? "9+" : itemCount}
                      </Badge>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            )}

            {/* Role switcher */}
            {isAuthenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 text-sm h-9 rounded-xl border-border/70" data-testid="button-role-switcher">
                    <span className="capitalize hidden sm:inline">{user?.role?.replace("_", " ")}</span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1">
                  <DropdownMenuItem onClick={() => setLocation("/")} className="rounded-xl gap-2.5 py-2.5" data-testid="menu-item-customer">
                    <Home className="w-4 h-4 text-primary" /> {t("nav.customerView")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/restaurant/dashboard")} className="rounded-xl gap-2.5 py-2.5" data-testid="menu-item-restaurant">
                    <Store className="w-4 h-4 text-primary" /> {t("nav.restaurantPanel")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/driver/dashboard")} className="rounded-xl gap-2.5 py-2.5" data-testid="menu-item-driver">
                    <Truck className="w-4 h-4 text-primary" /> {t("nav.driverApp")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/admin/dashboard")} className="rounded-xl gap-2.5 py-2.5" data-testid="menu-item-admin">
                    <LayoutDashboard className="w-4 h-4 text-primary" /> {t("nav.adminPanel")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* User menu */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-xl w-10 h-10" data-testid="button-user-menu">
                    <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center text-sm font-bold text-primary">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1">
                  <div className="px-3 py-2 mb-1">
                    <p className="text-sm font-semibold">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.phone || user?.email}</p>
                  </div>
                  <DropdownMenuSeparator className="mx-1" />
                  <DropdownMenuItem onClick={() => setLocation("/profile")} className="rounded-xl gap-2.5 py-2.5">
                    <User className="w-4 h-4 text-muted-foreground" /> {t("nav.profile")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/rewards")} className="rounded-xl gap-2.5 py-2.5">
                    <Gift className="w-4 h-4 text-primary" /> {t("nav.rewards")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/legal")} className="rounded-xl gap-2.5 py-2.5">
                    <FileText className="w-4 h-4 text-muted-foreground" /> Mentions légales
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="mx-1" />
                  <DropdownMenuItem onClick={logout} className="rounded-xl gap-2.5 py-2.5 text-destructive focus:text-destructive" data-testid="button-logout">
                    <LogOut className="w-4 h-4" /> {t("nav.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-9 rounded-xl" onClick={() => setLocation("/login")} data-testid="button-login">
                  {t("nav.login")}
                </Button>
                <Button size="sm" className="h-9 rounded-xl font-semibold shadow-sm shadow-primary/20" onClick={() => setLocation("/register")} data-testid="button-register">
                  {t("nav.signup")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>

      {/* Bottom nav for mobile (customer only) */}
      {isAuthenticated && isCustomer && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-background/90 backdrop-blur-xl border-t border-border/60 safe-area-pb">
          <div className="flex items-center justify-around h-16 px-2">
            {BOTTOM_NAV.map(({ href, icon: Icon, label }) => {
              const isActive = location === href || (href === "/restaurants" && location.startsWith("/restaurants/"));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex flex-col items-center gap-0.5 min-w-[56px] py-1 rounded-xl transition-all duration-200 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <div className={`relative p-1.5 rounded-xl transition-all duration-200 ${isActive ? "bg-primary/12" : ""}`}>
                    <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? "scale-110" : ""}`} />
                    {label === t("nav.orders") && itemCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full" />
                    )}
                  </div>
                  <span className={`text-[10px] font-medium leading-none ${isActive ? "text-primary" : ""}`}>{label}</span>
                </Link>
              );
            })}
            {/* Cart in bottom nav on mobile */}
            <button
              onClick={() => setLocation("/cart")}
              className={`flex flex-col items-center gap-0.5 min-w-[56px] py-1 rounded-xl transition-all duration-200 ${
                location === "/cart" ? "text-primary" : "text-muted-foreground"
              }`}
              data-testid="button-cart-mobile"
            >
              <div className={`relative p-1.5 rounded-xl transition-all duration-200 ${location === "/cart" ? "bg-primary/12" : ""}`}>
                <ShoppingBag className={`w-5 h-5 transition-transform duration-200 ${location === "/cart" ? "scale-110" : ""}`} />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center text-[9px] font-bold text-white">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium leading-none ${location === "/cart" ? "text-primary" : ""}`}>{t("nav.cart")}</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}

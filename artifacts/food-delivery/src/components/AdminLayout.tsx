import { type ReactNode, useState } from "react";
import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  Users,
  Store,
  Truck,
  Package,
  Star,
  LifeBuoy,
  Menu as MenuIcon,
  X,
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Tag,
  Ticket,
  Bell,
  Megaphone,
  CreditCard,
  Wallet,
  MapPin,
  Settings,
  ShieldCheck,
  FileText,
  Activity,
  Building2,
  ListChecks,
  Globe2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Vue d'ensemble",
    items: [
      { label: "Tableau de bord", href: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Statistiques", href: "/admin/stats", icon: BarChart3 },
      { label: "Performances", href: "/admin/performance", icon: TrendingUp },
      { label: "Activité en direct", href: "/admin/activity", icon: Activity },
    ],
  },
  {
    label: "Opérations",
    items: [
      { label: "Commandes", href: "/admin/orders", icon: Package },
      { label: "Restaurants", href: "/admin/restaurants", icon: Store },
      { label: "Livreurs", href: "/admin/drivers", icon: Truck },
      { label: "Catégories", href: "/admin/categories", icon: ListChecks },
      { label: "Zones de livraison", href: "/admin/zones", icon: MapPin },
    ],
  },
  {
    label: "Communauté",
    items: [
      { label: "Utilisateurs", href: "/admin/users", icon: Users },
      { label: "Avis", href: "/admin/reviews", icon: Star },
      { label: "Support", href: "/admin/support", icon: LifeBuoy },
      { label: "Signalements", href: "/admin/reports", icon: AlertTriangle },
    ],
  },
  {
    label: "Marketing",
    items: [
      { label: "Promotions", href: "/admin/promotions", icon: Tag },
      { label: "Coupons", href: "/admin/coupons", icon: Ticket },
      { label: "Annonces", href: "/admin/announcements", icon: Megaphone },
      { label: "Notifications", href: "/admin/notifications", icon: Bell },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Paiements", href: "/admin/payments", icon: CreditCard },
      { label: "Portefeuilles", href: "/admin/wallets", icon: Wallet },
      { label: "Rapports", href: "/admin/reports-finance", icon: FileText },
      { label: "Partenaires", href: "/admin/partners", icon: Building2 },
    ],
  },
  {
    label: "Système",
    items: [
      { label: "Paramètres", href: "/admin/settings", icon: Settings },
      { label: "Sécurité & rôles", href: "/admin/security", icon: ShieldCheck },
      { label: "Localisation", href: "/admin/i18n", icon: Globe2 },
      { label: "Journal d'audit", href: "/admin/audit", icon: FileText },
    ],
  },
];

const allNavItems: NavItem[] = navGroups.flatMap((g) => g.items);

interface AdminLayoutProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function AdminLayout({ title, subtitle, actions, children }: AdminLayoutProps) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Wouter's useLocation returns the path WITHOUT the artifact base, so we
  // can match nav hrefs directly against `location` (no need to strip prefix).
  const isActive = (href: string) =>
    location === href || location.startsWith(href + "/");

  return (
    <div className="flex min-h-[calc(100vh-4rem)] -mx-4 sm:-mx-6 lg:-mx-8">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-e border-border bg-card/40">
        <div className="px-5 py-5 border-b border-border">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Espace admin
          </p>
          <h2 className="font-display font-bold text-lg mt-0.5">Jatek</h2>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/80">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <a
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        isActive(item.href)
                          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                          : "text-foreground/75 hover:bg-muted hover:text-foreground"
                      )}
                      data-testid={`nav-admin-${item.href.split("/").pop()}`}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </a>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <Link href="/">
            <a className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> Retour à l'app
            </a>
          </Link>
        </div>
      </aside>

      {/* Sidebar — mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="md:hidden fixed inset-y-0 left-0 w-72 z-50 bg-card border-e border-border flex flex-col">
            <div className="px-5 py-5 border-b border-border flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Espace admin
                </p>
                <h2 className="font-display font-bold text-lg mt-0.5">Jatek</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
              {navGroups.map((group) => (
                <div key={group.label}>
                  <p className="px-3 pb-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/80">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      <Link key={item.href} href={item.href}>
                        <a
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                            isActive(item.href)
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground/75 hover:bg-muted"
                          )}
                        >
                          <item.icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </a>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </aside>
        </>
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6">
        <div className="md:flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <MenuIcon className="w-5 h-5" />
            </Button>
            <div>
              {title && <h1 className="font-display font-bold text-2xl">{title}</h1>}
              {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="mt-3 md:mt-0 flex gap-2 flex-wrap">{actions}</div>}
        </div>

        {children}
      </div>
    </div>
  );
}

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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
};

const navItems: NavItem[] = [
  { label: "Tableau de bord", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Utilisateurs", href: "/admin/users", icon: Users },
  { label: "Restaurants", href: "/admin/restaurants", icon: Store },
  { label: "Livreurs", href: "/admin/drivers", icon: Truck },
  { label: "Commandes", href: "/admin/orders", icon: Package },
  { label: "Avis", href: "/admin/reviews", icon: Star },
  { label: "Support", href: "/admin/support", icon: LifeBuoy },
];

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
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-e border-border bg-card/40">
        <div className="px-5 py-5 border-b border-border">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Espace admin
          </p>
          <h2 className="font-display font-bold text-lg mt-0.5">Jatek</h2>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <a
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "text-foreground/80 hover:bg-muted hover:text-foreground"
                )}
                data-testid={`nav-admin-${item.href.split("/").pop()}`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </a>
            </Link>
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
          <aside className="md:hidden fixed inset-y-0 left-0 w-64 z-50 bg-card border-e border-border flex flex-col">
            <div className="px-5 py-5 border-b border-border flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Espace admin
                </p>
                <h2 className="font-display font-bold text-lg mt-0.5">Jatek</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <a
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground/80 hover:bg-muted"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </a>
                </Link>
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

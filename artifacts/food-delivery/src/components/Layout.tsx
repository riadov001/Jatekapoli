import { Link, useLocation } from "wouter";
import { ShoppingBag, Home, UtensilsCrossed, Package, Gift, User, LogOut, ChevronDown, MapPin, Truck, LayoutDashboard, Users, Store, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout, isAuthenticated } = useAuth();
  const { itemCount } = useCart();
  const [location, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-display font-bold text-xl text-primary shrink-0">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Truck className="w-4 h-4 text-white" />
            </div>
            <span>Tawsila</span>
          </Link>

          {/* Location */}
          <button className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <MapPin className="w-4 h-4 text-primary" />
            <span>Oujda, Maroc</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Cart */}
            {isAuthenticated && user?.role === "customer" && (
              <Button variant="ghost" size="icon" className="relative" onClick={() => setLocation("/cart")} data-testid="button-cart">
                <ShoppingBag className="w-5 h-5" />
                {itemCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs bg-primary text-white">
                    {itemCount}
                  </Badge>
                )}
              </Button>
            )}

            {/* Role switcher */}
            {isAuthenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 text-sm" data-testid="button-role-switcher">
                    <span className="capitalize">{user?.role?.replace("_", " ")}</span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setLocation("/")} data-testid="menu-item-customer">
                    <Home className="w-4 h-4 mr-2" /> Customer View
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/restaurant/dashboard")} data-testid="menu-item-restaurant">
                    <Store className="w-4 h-4 mr-2" /> Restaurant Panel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/driver/dashboard")} data-testid="menu-item-driver">
                    <Truck className="w-4 h-4 mr-2" /> Driver App
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/admin/dashboard")} data-testid="menu-item-admin">
                    <LayoutDashboard className="w-4 h-4 mr-2" /> Admin Panel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* User menu */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid="button-user-menu">
                    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-sm font-semibold text-primary">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation("/profile")}>
                    <User className="w-4 h-4 mr-2" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/rewards")}>
                    <Gift className="w-4 h-4 mr-2" /> Rewards
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive" data-testid="button-logout">
                    <LogOut className="w-4 h-4 mr-2" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setLocation("/login")} data-testid="button-login">
                  Login
                </Button>
                <Button size="sm" onClick={() => setLocation("/register")} data-testid="button-register">
                  Sign up
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

      {/* Bottom nav for mobile */}
      {isAuthenticated && user?.role === "customer" && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-background border-t border-border/60 flex items-center justify-around h-16">
          <Link href="/" className={`flex flex-col items-center gap-1 text-xs ${location === "/" ? "text-primary" : "text-muted-foreground"}`}>
            <Home className="w-5 h-5" />
            <span>Home</span>
          </Link>
          <Link href="/restaurants" className={`flex flex-col items-center gap-1 text-xs ${location === "/restaurants" ? "text-primary" : "text-muted-foreground"}`}>
            <UtensilsCrossed className="w-5 h-5" />
            <span>Restaurants</span>
          </Link>
          <Link href="/orders" className={`flex flex-col items-center gap-1 text-xs ${location === "/orders" ? "text-primary" : "text-muted-foreground"}`}>
            <Package className="w-5 h-5" />
            <span>Orders</span>
          </Link>
          <Link href="/rewards" className={`flex flex-col items-center gap-1 text-xs ${location === "/rewards" ? "text-primary" : "text-muted-foreground"}`}>
            <Gift className="w-5 h-5" />
            <span>Rewards</span>
          </Link>
        </nav>
      )}
    </div>
  );
}

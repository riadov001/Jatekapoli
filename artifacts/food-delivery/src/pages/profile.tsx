import { useLocation } from "wouter";
import { User, Phone, MapPin, LogOut, Package, Gift, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useListOrders } from "@workspace/api-client-react";
import { useTranslation } from "react-i18next";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [_, setLocation] = useLocation();
  const { t } = useTranslation();

  const { data: orders } = useListOrders(
    user ? { userId: user.id } : undefined,
    { query: { enabled: !!user } }
  );

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground mb-4">{t("profile.loginRequired")}</p>
        <Button onClick={() => setLocation("/login")}>{t("common.login")}</Button>
      </div>
    );
  }

  const tierName = user.loyaltyPoints >= 500 ? "Gold" : user.loyaltyPoints >= 100 ? "Silver" : "Bronze";

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-6">
      {/* Profile header */}
      <div className="bg-gradient-to-br from-primary to-amber-500 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold font-display">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="font-display font-bold text-xl">{user.name}</h1>
            <p className="text-white/80 text-sm">{user.email}</p>
            <Badge className="mt-1 bg-white/20 text-white border-0 text-xs capitalize">
              {user.role.replace("_", " ")}
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-card-border p-4 text-center" data-testid="stat-orders">
          <Package className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="font-bold text-xl">{orders?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground">{t("profile.orders")}</p>
        </div>
        <div className="bg-card rounded-xl border border-card-border p-4 text-center" data-testid="stat-points">
          <Gift className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="font-bold text-xl">{user.loyaltyPoints}</p>
          <p className="text-xs text-muted-foreground">{t("profile.points")}</p>
        </div>
        <div className="bg-card rounded-xl border border-card-border p-4 text-center" data-testid="stat-tier">
          <Star className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
          <p className="font-bold text-sm">{tierName}</p>
          <p className="text-xs text-muted-foreground">{t("profile.tier")}</p>
        </div>
      </div>

      {/* Info */}
      <div className="bg-card rounded-2xl border border-card-border divide-y divide-border">
        <div className="flex items-center gap-3 p-4">
          <User className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">{t("profile.name")}</p>
            <p className="text-sm font-medium">{user.name}</p>
          </div>
        </div>
        {user.phone && (
          <div className="flex items-center gap-3 p-4">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t("profile.phone")}</p>
              <p className="text-sm font-medium">{user.phone}</p>
            </div>
          </div>
        )}
        {user.address && (
          <div className="flex items-center gap-3 p-4">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t("profile.address")}</p>
              <p className="text-sm font-medium">{user.address}</p>
            </div>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="space-y-2">
        <Button variant="outline" className="w-full justify-start gap-2 h-12" onClick={() => setLocation("/orders")}>
          <Package className="w-4 h-4" />
          {t("profile.myOrders")}
        </Button>
        <Button variant="outline" className="w-full justify-start gap-2 h-12" onClick={() => setLocation("/rewards")}>
          <Gift className="w-4 h-4" />
          {t("profile.rewardsAndPoints")}
        </Button>
      </div>

      <Button variant="destructive" className="w-full gap-2 h-11" onClick={() => { logout(); setLocation("/"); }} data-testid="button-logout">
        <LogOut className="w-4 h-4" />
        {t("profile.logout")}
      </Button>
    </div>
  );
}

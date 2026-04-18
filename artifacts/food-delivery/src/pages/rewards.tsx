import { useLocation } from "wouter";
import { Gift, Award, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetMyRewards } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

const tierConfig = {
  Bronze: { color: "text-amber-700", bg: "bg-amber-100 dark:bg-amber-900/30", icon: "🥉" },
  Silver: { color: "text-slate-500", bg: "bg-slate-100 dark:bg-slate-900/30", icon: "🥈" },
  Gold: { color: "text-yellow-600", bg: "bg-yellow-100 dark:bg-yellow-900/30", icon: "🥇" },
};

const DISCOUNTS = [
  { points: 50, en: "5% off next order", fr: "5% de réduction", ar: "خصم 5% على الطلب التالي", days: 7 },
  { points: 100, en: "10% off next order", fr: "10% de réduction", ar: "خصم 10% على الطلب التالي", days: 14 },
  { points: 200, en: "Free delivery on next 3 orders", fr: "Livraison gratuite (3 commandes)", ar: "توصيل مجاني على 3 طلبات", days: 30 },
  { points: 500, en: "20% off any order", fr: "20% de réduction sur tout", ar: "خصم 20% على أي طلب", days: null },
];

export default function RewardsPage() {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  const { t, i18n } = useTranslation();

  const { data: rewards, isLoading } = useGetMyRewards({ query: { enabled: !!user } });

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground mb-4">{t("rewards.loginRequired")}</p>
        <Button onClick={() => setLocation("/login")}>{t("rewards.login")}</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  const tier = (rewards?.tier ?? "Bronze") as keyof typeof tierConfig;
  const tierInfo = tierConfig[tier] || tierConfig.Bronze;
  const points = rewards?.loyaltyPoints ?? 0;
  const progress = tier === "Bronze"
    ? Math.min(100, (points / 100) * 100)
    : tier === "Silver"
    ? Math.min(100, ((points - 100) / 400) * 100)
    : 100;

  const getLabel = (d: typeof DISCOUNTS[0]) => {
    if (i18n.language === "ar") return d.ar;
    if (i18n.language === "fr") return d.fr;
    return d.en;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-6">
      <h1 className="font-display font-bold text-2xl">{t("rewards.title")}</h1>

      {/* Points card */}
      <div className="relative bg-gradient-to-br from-primary via-primary to-pink-400 rounded-2xl p-6 overflow-hidden text-white">
        <div className="absolute top-0 right-0 text-8xl opacity-20 -mt-4 -mr-4">🎁</div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="w-5 h-5" />
            <span className="text-white/80 text-sm font-medium">{t("rewards.loyaltyPoints")}</span>
          </div>
          <p className="font-display font-bold text-5xl mb-1" data-testid="text-loyalty-points">{points}</p>
          <p className="text-white/70 text-sm">{t("rewards.pts")}</p>
        </div>
      </div>

      {/* Tier status */}
      <div className={`rounded-2xl border border-card-border p-5 ${tierInfo.bg}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{tierInfo.icon}</span>
            <div>
              <p className="font-bold text-base" data-testid="text-tier">{t("rewards.member", { tier })}</p>
              <p className="text-xs text-muted-foreground">
                {rewards?.totalOrdersCount ?? 0} {t("profile.orders").toLowerCase()} • {(rewards?.totalSpent ?? 0).toFixed(0)} MAD
              </p>
            </div>
          </div>
          <Award className={`w-6 h-6 ${tierInfo.color}`} />
        </div>
        {tier !== "Gold" && (
          <>
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>{points} {t("rewards.pts")}</span>
              <span>{t("rewards.toNext", { count: rewards?.nextTierPoints ?? 0, tier: tier === "Bronze" ? "Silver" : "Gold" })}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </>
        )}
        {tier === "Gold" && (
          <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">{t("rewards.highestTier")}</p>
        )}
      </div>

      {/* How to earn */}
      <div className="bg-card rounded-2xl border border-card-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm">{t("rewards.howToEarn")}</h2>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("rewards.per10MAD")}</span>
            <span className="font-semibold text-primary">+1 {t("rewards.pts")}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("rewards.firstOrderBonus")}</span>
            <span className="font-semibold text-primary">+50 {t("rewards.pts")}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("rewards.leaveReview")}</span>
            <span className="font-semibold text-primary">+10 {t("rewards.pts")}</span>
          </div>
        </div>
      </div>

      {/* Available rewards */}
      <div>
        <h2 className="font-semibold text-base mb-3">{t("rewards.availableRewards")}</h2>
        <div className="space-y-3">
          {DISCOUNTS.map((d, i) => {
            const canRedeem = points >= d.points;
            return (
              <div key={i} className={`p-4 rounded-xl border border-card-border ${canRedeem ? "bg-card" : "bg-muted/50"}`} data-testid={`reward-card-${i}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-semibold text-sm ${!canRedeem ? "text-muted-foreground" : ""}`}>{getLabel(d)}</p>
                    {d.days ? (
                      <p className="text-xs text-muted-foreground">{t("rewards.validDays", { days: d.days })}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">{t("rewards.premiumReward")}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-sm ${canRedeem ? "text-primary" : "text-muted-foreground"}`}>{d.points} {t("rewards.pts")}</p>
                    {canRedeem ? (
                      <Button size="sm" variant="outline" className="mt-1 h-7 text-xs rounded-full">
                        {t("rewards.redeem")}
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">{t("rewards.needMore", { count: d.points - points })}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

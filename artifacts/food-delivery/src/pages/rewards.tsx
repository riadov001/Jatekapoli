import { useLocation } from "wouter";
import { Gift, Star, Award, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetMyRewards } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";

const tierConfig = {
  Bronze: { color: "text-amber-700", bg: "bg-amber-100 dark:bg-amber-900/30", icon: "🥉" },
  Silver: { color: "text-slate-500", bg: "bg-slate-100 dark:bg-slate-900/30", icon: "🥈" },
  Gold: { color: "text-yellow-600", bg: "bg-yellow-100 dark:bg-yellow-900/30", icon: "🥇" },
};

const discounts = [
  { points: 50, discount: "5% off your next order", description: "Valid for 7 days" },
  { points: 100, discount: "10% off your next order", description: "Valid for 14 days" },
  { points: 200, discount: "Free delivery on next 3 orders", description: "Valid for 30 days" },
  { points: 500, discount: "20% off any order", description: "Premium reward" },
];

export default function RewardsPage() {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();

  const { data: rewards, isLoading } = useGetMyRewards({ query: { enabled: !!user } });

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground mb-4">Please login to view your rewards</p>
        <Button onClick={() => setLocation("/login")}>Login</Button>
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
  const progress = tier === "Bronze"
    ? Math.min(100, ((rewards?.loyaltyPoints ?? 0) / 100) * 100)
    : tier === "Silver"
    ? Math.min(100, (((rewards?.loyaltyPoints ?? 0) - 100) / 400) * 100)
    : 100;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-6">
      <h1 className="font-display font-bold text-2xl">My Rewards</h1>

      {/* Points card */}
      <div className="relative bg-gradient-to-br from-primary to-amber-500 rounded-2xl p-6 overflow-hidden text-white">
        <div className="absolute top-0 right-0 text-8xl opacity-20 -mt-4 -mr-4">🎁</div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="w-5 h-5" />
            <span className="text-white/80 text-sm font-medium">Loyalty Points</span>
          </div>
          <p className="font-display font-bold text-5xl mb-1" data-testid="text-loyalty-points">{rewards?.loyaltyPoints ?? 0}</p>
          <p className="text-white/70 text-sm">pts</p>
        </div>
      </div>

      {/* Tier status */}
      <div className={`rounded-2xl border border-card-border p-5 ${tierInfo.bg}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{tierInfo.icon}</span>
            <div>
              <p className="font-bold text-base" data-testid="text-tier">{tier} Member</p>
              <p className="text-xs text-muted-foreground">{rewards?.totalOrdersCount ?? 0} orders • {(rewards?.totalSpent ?? 0).toFixed(0)} MAD spent</p>
            </div>
          </div>
          <Award className={`w-6 h-6 ${tierInfo.color}`} />
        </div>
        {tier !== "Gold" && (
          <>
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>{rewards?.loyaltyPoints ?? 0} pts</span>
              <span>{(rewards?.nextTierPoints ?? 0) + (rewards?.loyaltyPoints ?? 0)} pts to {tier === "Bronze" ? "Silver" : "Gold"}</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1.5">
              {rewards?.nextTierPoints ?? 0} more points to reach {tier === "Bronze" ? "Silver" : "Gold"}
            </p>
          </>
        )}
        {tier === "Gold" && (
          <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">You've reached the highest tier!</p>
        )}
      </div>

      {/* How to earn */}
      <div className="bg-card rounded-2xl border border-card-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm">How to earn points</h2>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Per 10 MAD spent</span>
            <span className="font-semibold text-primary">+1 point</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">First order bonus</span>
            <span className="font-semibold text-primary">+50 points</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Leave a review</span>
            <span className="font-semibold text-primary">+10 points</span>
          </div>
        </div>
      </div>

      {/* Available rewards */}
      <div>
        <h2 className="font-semibold text-base mb-3">Available Rewards</h2>
        <div className="space-y-3">
          {discounts.map((d, i) => {
            const canRedeem = (rewards?.loyaltyPoints ?? 0) >= d.points;
            return (
              <div key={i} className={`p-4 rounded-xl border border-card-border ${canRedeem ? "bg-card" : "bg-muted/50"}`} data-testid={`reward-card-${i}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-semibold text-sm ${!canRedeem ? "text-muted-foreground" : ""}`}>{d.discount}</p>
                    <p className="text-xs text-muted-foreground">{d.description}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-sm ${canRedeem ? "text-primary" : "text-muted-foreground"}`}>{d.points} pts</p>
                    {canRedeem && (
                      <Button size="sm" variant="outline" className="mt-1 h-7 text-xs rounded-full">
                        Redeem
                      </Button>
                    )}
                    {!canRedeem && (
                      <p className="text-xs text-muted-foreground mt-1">Need {d.points - (rewards?.loyaltyPoints ?? 0)} more</p>
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

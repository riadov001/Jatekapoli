import { useLocation } from "wouter";
import { ArrowLeft, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useListRestaurants, useUpdateRestaurant } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminRestaurantsPage() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: restaurants, isLoading, refetch } = useListRestaurants();
  const updateRestaurant = useUpdateRestaurant();

  const toggleOpen = (id: number, current: boolean) => {
    updateRestaurant.mutate({ id, data: { isOpen: !current } }, {
      onSuccess: () => { toast({ title: "Status updated" }); refetch(); },
    });
  };

  const toggleLocal = (id: number, current: boolean) => {
    updateRestaurant.mutate({ id, data: { isLocal: !current } }, {
      onSuccess: () => { toast({ title: "Local badge updated" }); refetch(); },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/dashboard")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="font-display font-bold text-xl">Manage Restaurants</h1>
          <p className="text-muted-foreground text-sm">{restaurants?.length ?? 0} restaurants</p>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
        ) : (restaurants ?? []).map((r) => (
          <div key={r.id} className="bg-card rounded-2xl border border-card-border p-4 flex items-center gap-4" data-testid={`row-restaurant-${r.id}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-semibold text-sm">{r.name}</p>
                {r.isLocal && <Award className="w-3.5 h-3.5 text-green-600" />}
              </div>
              <p className="text-xs text-muted-foreground">{r.category} • Rating: {r.rating?.toFixed(1) ?? "N/A"}</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground">Local</span>
                <Switch
                  checked={r.isLocal}
                  onCheckedChange={() => toggleLocal(r.id, r.isLocal)}
                  data-testid={`switch-local-${r.id}`}
                />
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground">Open</span>
                <Switch
                  checked={r.isOpen}
                  onCheckedChange={() => toggleOpen(r.id, r.isOpen)}
                  data-testid={`switch-open-${r.id}`}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

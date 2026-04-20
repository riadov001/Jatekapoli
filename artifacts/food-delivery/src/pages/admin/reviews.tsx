import { useState, useMemo, useEffect } from "react";
import { Search, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useListReviews, useDeleteReview, useListRestaurants } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/AdminLayout";

export default function AdminReviewsPage() {
  const { toast } = useToast();
  const { data: reviews, isLoading, refetch } = useListReviews();
  const { data: restaurants } = useListRestaurants();
  const deleteReview = useDeleteReview();

  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [restaurantFilter, setRestaurantFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const restaurantNameById = useMemo(() => {
    const map = new Map<number, string>();
    (restaurants ?? []).forEach((r: any) => map.set(r.id, r.name));
    return map;
  }, [restaurants]);

  const filtered = useMemo(() => {
    const list = [...(reviews ?? [])].sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return list.filter((rv: any) => {
      if (ratingFilter !== "all" && rv.rating !== Number(ratingFilter)) return false;
      if (restaurantFilter !== "all" && rv.restaurantId !== Number(restaurantFilter))
        return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (rv.userName ?? "").toLowerCase().includes(q) ||
        (rv.comment ?? "").toLowerCase().includes(q) ||
        (restaurantNameById.get(rv.restaurantId) ?? "").toLowerCase().includes(q)
      );
    });
  }, [reviews, search, ratingFilter, restaurantFilter, restaurantNameById]);

  const avgRating =
    reviews && reviews.length > 0
      ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length
      : 0;

  const confirmDelete = () => {
    if (!deletingId) return;
    deleteReview.mutate(
      { id: deletingId },
      {
        onSuccess: () => {
          toast({ title: "Avis supprimé" });
          setDeletingId(null);
          refetch();
        },
        onError: () => toast({ title: "Erreur", variant: "destructive" }),
      }
    );
  };

  return (
    <AdminLayout
      title="Avis clients"
      subtitle={`${filtered.length} avis · note moyenne ${avgRating.toFixed(1)} ★`}
    >
      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les notes</SelectItem>
            {[5, 4, 3, 2, 1].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} étoile{n > 1 ? "s" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={restaurantFilter} onValueChange={setRestaurantFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Restaurant" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les restaurants</SelectItem>
            {(restaurants ?? []).map((r: any) => (
              <SelectItem key={r.id} value={String(r.id)}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 bg-card rounded-2xl border border-card-border">
            Aucun avis
          </div>
        ) : (
          filtered.map((review: any) => (
            <div
              key={review.id}
              className="bg-card rounded-2xl border border-card-border p-4"
              data-testid={`row-review-${review.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{review.userName}</span>
                    <Badge variant="outline" className="text-xs">
                      {restaurantNameById.get(review.restaurantId) ??
                        `Restaurant #${review.restaurantId}`}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString("fr-FR", {
                        dateStyle: "medium",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 mt-1.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`w-4 h-4 ${
                          n <= review.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                  {review.comment && (
                    <p className="text-sm mt-2 text-foreground/90">{review.comment}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                  onClick={() => setDeletingId(review.id)}
                  data-testid={`button-delete-review-${review.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet avis ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'avis sera retiré et la note moyenne du restaurant ne sera pas
              automatiquement recalculée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteReview.isPending ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

import { useListBackendReviews } from "@workspace/api-client-react";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Star } from "lucide-react";
import { format } from "date-fns";

export default function Reviews() {
  const { data: reviews, isLoading } = useListBackendReviews();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Reviews</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Shop ID</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead className="w-[40%]">Comment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full max-w-[300px]" /></TableCell>
                  </TableRow>
                ))
              ) : reviews?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No reviews found.
                  </TableCell>
                </TableRow>
              ) : (
                reviews?.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(new Date(review.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="font-medium">{review.userName}</TableCell>
                    <TableCell>#{review.restaurantId}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            className={`h-4 w-4 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted'}`} 
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground italic">
                      "{review.comment || "No comment provided."}"
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

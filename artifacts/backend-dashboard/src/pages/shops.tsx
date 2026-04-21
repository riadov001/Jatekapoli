import { useState } from "react";
import { useListBackendShops } from "@workspace/api-client-react";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Star, Store, MapPin, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Shops() {
  const [search, setSearch] = useState("");
  const { data: shops, isLoading } = useListBackendShops({ search: search || undefined });
  const { toast } = useToast();

  const handleEditClick = () => {
    toast({
      title: "Read only",
      description: "Shop editing will be available soon.",
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Shops</h1>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search shops..." 
              className="pl-8" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : shops?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No shops found.
                  </TableCell>
                </TableRow>
              ) : (
                shops?.map((shop) => (
                  <TableRow key={shop.id} className="cursor-pointer hover:bg-muted/50" onClick={handleEditClick}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center overflow-hidden border">
                          {shop.logoUrl ? (
                            <img src={shop.logoUrl} alt={shop.name} className="h-full w-full object-cover" />
                          ) : (
                            <Store className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold">{shop.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center mt-0.5">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span className="truncate max-w-[200px]">{shop.address}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{shop.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {shop.phone || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span className="font-medium">{shop.rating || "New"}</span>
                        <span className="text-xs text-muted-foreground">({shop.reviewCount})</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={shop.isOpen ? "bg-green-500 hover:bg-green-600" : "bg-destructive"}>
                        {shop.isOpen ? "Open" : "Closed"}
                      </Badge>
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

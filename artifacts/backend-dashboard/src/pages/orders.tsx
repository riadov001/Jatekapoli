import { useState } from "react";
import { useListBackendOrders, useUpdateOrderStatus, getListBackendOrdersQueryKey, Order, UpdateOrderStatusBodyStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
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
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription 
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Orders() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data: orders, isLoading } = useListBackendOrders({ 
    search: search || undefined, 
    status: status !== "all" ? status : undefined 
  });
  const updateStatus = useUpdateOrderStatus();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [newStatus, setNewStatus] = useState<string>("");

  const handleStatusUpdate = () => {
    if (!selectedOrder || !newStatus) return;
    updateStatus.mutate({ id: selectedOrder.id, data: { status: newStatus as UpdateOrderStatusBodyStatus } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListBackendOrdersQueryKey() });
        setSelectedOrder({ ...selectedOrder, status: newStatus as any });
        toast({ title: "Statut mis à jour" });
      },
      onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search orders..." 
                className="pl-8 w-full" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="preparing">Preparing</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="picked_up">Picked Up</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden sm:table-cell">Restaurant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : orders?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No orders found.
                  </TableCell>
                </TableRow>
              ) : (
                orders?.map((order) => (
                  <TableRow 
                    key={order.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <TableCell className="font-medium">#{order.id}</TableCell>
                    <TableCell className="hidden sm:table-cell">{format(new Date(order.createdAt), "MMM d, yyyy HH:mm")}</TableCell>
                    <TableCell>{order.userName}</TableCell>
                    <TableCell className="hidden sm:table-cell">{order.restaurantName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase bg-primary/10 text-primary border-primary/20">
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">{order.total} DH</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selectedOrder} onOpenChange={(o) => !o && setSelectedOrder(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selectedOrder && (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle className="text-2xl">Order #{selectedOrder.id}</SheetTitle>
                <SheetDescription>
                  Placed on {format(new Date(selectedOrder.createdAt), "PPP 'at' p")}
                </SheetDescription>
              </SheetHeader>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Status</p>
                    <Badge className="uppercase">{selectedOrder.status}</Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground mb-1">Total</p>
                    <p className="text-xl font-bold text-primary">{selectedOrder.total} DH</p>
                  </div>
                </div>

                <div className="border rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium">Changer le statut</p>
                  <div className="flex gap-2">
                    <Select value={newStatus || selectedOrder.status} onValueChange={setNewStatus}>
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="preparing">Preparing</SelectItem>
                        <SelectItem value="ready">Ready</SelectItem>
                        <SelectItem value="picked_up">Picked Up</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={handleStatusUpdate} disabled={updateStatus.isPending || !newStatus || newStatus === selectedOrder.status}>
                      {updateStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Appliquer"}
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Customer</span>
                      <span className="font-medium">{selectedOrder.userName}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Restaurant</span>
                      <span className="font-medium">{selectedOrder.restaurantName}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Address</span>
                      <span className="font-medium text-right max-w-[200px]">{selectedOrder.deliveryAddress}</span>
                    </div>
                    {selectedOrder.notes && (
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-muted-foreground">Notes</span>
                        <span className="font-medium">{selectedOrder.notes}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Items</h3>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-sm p-3 border rounded-md">
                        <div className="flex items-center space-x-3">
                          <Badge variant="secondary">{item.quantity}x</Badge>
                          <span>{item.menuItemName}</span>
                        </div>
                        <span className="font-medium">{item.totalPrice} DH</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{selectedOrder.subtotal} DH</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Delivery Fee</span>
                    <span>{selectedOrder.deliveryFee} DH</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-2 border-t">
                    <span>Total</span>
                    <span className="text-primary">{selectedOrder.total} DH</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

import { useState } from "react";
import { useListBackendDeliverymen, useUpdateDriver, getListBackendDeliverymenQueryKey } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Truck, Star, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Deliverymen() {
  const { data: drivers, isLoading } = useListBackendDeliverymen();
  const update = useUpdateDriver();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ vehicleType: "", isAvailable: true });

  const openEdit = (d: any) => { setEditing(d); setForm({ vehicleType: d.vehicleType ?? "", isAvailable: d.isAvailable }); };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    update.mutate({ id: editing.userId, data: form as any }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListBackendDeliverymenQueryKey() }); setEditing(null); toast({ title: "Modifié" }); },
      onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between"><h1 className="text-3xl font-bold tracking-tight">Livreurs</h1></div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-6">Livreur</TableHead>
                <TableHead>Véhicule</TableHead>
                <TableHead>Livraisons</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right px-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell className="px-6"><Skeleton className="h-4 w-32" /></TableCell><TableCell><Skeleton className="h-4 w-20" /></TableCell><TableCell><Skeleton className="h-4 w-12" /></TableCell><TableCell><Skeleton className="h-4 w-16" /></TableCell><TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell><TableCell className="px-6"><Skeleton className="h-8 w-8 ml-auto" /></TableCell></TableRow>
              )) : drivers?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Aucun livreur.</TableCell></TableRow>
              ) : drivers?.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="px-6 font-medium"><div className="flex flex-col"><span>{d.name}</span><span className="text-xs text-muted-foreground">{d.phone}</span></div></TableCell>
                  <TableCell><div className="flex items-center space-x-2 text-sm"><Truck className="h-4 w-4 text-muted-foreground" /><span className="capitalize">{d.vehicleType || "—"}</span></div></TableCell>
                  <TableCell className="font-bold">{d.totalDeliveries}</TableCell>
                  <TableCell><div className="flex items-center space-x-1"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /><span className="font-medium">{d.rating?.toFixed(1) || "Nouveau"}</span></div></TableCell>
                  <TableCell><Badge variant={d.isAvailable ? "default" : "secondary"}>{d.isAvailable ? "Disponible" : "Hors ligne"}</Badge></TableCell>
                  <TableCell className="text-right px-6"><Button variant="ghost" size="icon" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier {editing?.name}</DialogTitle></DialogHeader>
          {editing && (
            <form onSubmit={handleSave} className="space-y-3 pt-4">
              <div className="space-y-1"><Label className="text-xs">Type de véhicule</Label><Input value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })} placeholder="moto, vélo, voiture..." /></div>
              <div className="flex items-center gap-2"><Switch checked={form.isAvailable} onCheckedChange={(v) => setForm({ ...form, isAvailable: v })} /><Label>Disponible</Label></div>
              <DialogFooter className="pt-4"><Button type="submit" disabled={update.isPending}>{update.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Enregistrer</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

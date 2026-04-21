import { AdminLayout } from "@/components/AdminLayout";
import { Construction } from "lucide-react";

interface Props {
  title: string;
  subtitle?: string;
}

export default function AdminPlaceholderPage({ title, subtitle }: Props) {
  return (
    <AdminLayout title={title} subtitle={subtitle ?? "Bientôt disponible"}>
      <div className="flex flex-col items-center justify-center text-center py-20 gap-4 rounded-2xl border border-dashed border-border bg-card/30">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Construction className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h3 className="font-display font-bold text-lg">Module en construction</h3>
          <p className="text-sm text-muted-foreground max-w-md mt-1">
            Cette section est planifiée et apparaîtra prochainement dans le portail admin.
            En attendant, utilisez les autres modules disponibles dans la barre latérale.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}

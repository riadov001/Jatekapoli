import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useBackendMe } from "@workspace/api-client-react";
import {
  Globe,
  Truck,
  Bell,
  Shield,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "jatek_platform_settings";

interface PlatformSettings {
  appName: string;
  supportEmail: string;
  supportPhone: string;
  defaultDeliveryFee: string;
  maxDeliveryRadiusKm: string;
  minOrderAmount: string;
  orderNotificationsEnabled: boolean;
  maintenanceMode: boolean;
  city: string;
  currency: string;
}

function loadSettings(): PlatformSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaults(), ...JSON.parse(raw) };
  } catch {}
  return defaults();
}

function defaults(): PlatformSettings {
  return {
    appName: "Jatek",
    supportEmail: "support@jatek.ma",
    supportPhone: "+212600000000",
    defaultDeliveryFee: "15",
    maxDeliveryRadiusKm: "10",
    minOrderAmount: "30",
    orderNotificationsEnabled: true,
    maintenanceMode: false,
    city: "Oujda",
    currency: "MAD",
  };
}

function SectionCard({
  title,
  icon: Icon,
  description,
  children,
}: {
  title: string;
  icon: React.ElementType;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">{title}</span>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  suffix,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  suffix?: string;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-sm">{label}</Label>
      <div className="flex gap-2 items-center">
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1"
        />
        {suffix && (
          <span className="text-sm text-muted-foreground whitespace-nowrap">{suffix}</span>
        )}
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { data: me } = useBackendMe({});
  const [settings, setSettings] = useState<PlatformSettings>(loadSettings);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  const isAdmin = me?.role === "super_admin" || me?.role === "admin";

  const set = (k: keyof PlatformSettings) => (v: string | boolean) =>
    setSettings((p) => ({ ...p, [k]: v }));

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    toast({ title: "Paramètres sauvegardés" });
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <AdminLayout
      title="Paramètres"
      subtitle="Configuration de la plateforme Jatek"
      actions={
        <div className="flex items-center gap-3">
          {saved && (
            <div className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>Sauvegardé</span>
            </div>
          )}
          <Button onClick={handleSave} disabled={!isAdmin} size="sm">
            Sauvegarder
          </Button>
        </div>
      }
    >
      {!isAdmin && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-5 py-3.5 flex items-center gap-3">
          <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Accès en lecture seule. Seuls les admins et super admins peuvent modifier ces paramètres.
          </p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard
          title="Informations générales"
          icon={Globe}
          description="Nom et coordonnées de la plateforme"
        >
          <Field
            label="Nom de l'application"
            value={settings.appName}
            onChange={set("appName")}
            placeholder="Jatek"
            disabled={!isAdmin}
          />
          <Field
            label="Ville principale"
            value={settings.city}
            onChange={set("city")}
            placeholder="Oujda"
            disabled={!isAdmin}
          />
          <Field
            label="Devise"
            value={settings.currency}
            onChange={set("currency")}
            placeholder="MAD"
            disabled={!isAdmin}
          />
          <Separator />
          <Field
            label="Email support"
            value={settings.supportEmail}
            onChange={set("supportEmail")}
            type="email"
            placeholder="support@jatek.ma"
            disabled={!isAdmin}
          />
          <Field
            label="Téléphone support"
            value={settings.supportPhone}
            onChange={set("supportPhone")}
            type="tel"
            placeholder="+212600000000"
            disabled={!isAdmin}
          />
        </SectionCard>

        <SectionCard
          title="Livraison"
          icon={Truck}
          description="Paramètres par défaut pour les livraisons"
        >
          <Field
            label="Frais de livraison par défaut"
            value={settings.defaultDeliveryFee}
            onChange={set("defaultDeliveryFee")}
            type="number"
            suffix="MAD"
            disabled={!isAdmin}
          />
          <Field
            label="Rayon de livraison max"
            value={settings.maxDeliveryRadiusKm}
            onChange={set("maxDeliveryRadiusKm")}
            type="number"
            suffix="km"
            disabled={!isAdmin}
          />
          <Field
            label="Montant minimum de commande"
            value={settings.minOrderAmount}
            onChange={set("minOrderAmount")}
            type="number"
            suffix="MAD"
            disabled={!isAdmin}
          />
        </SectionCard>

        <SectionCard
          title="Notifications"
          icon={Bell}
          description="Activation des notifications système"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Notifications de commandes</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Alertes à la création et mise à jour des commandes
              </p>
            </div>
            <Switch
              checked={settings.orderNotificationsEnabled}
              onCheckedChange={(v) => set("orderNotificationsEnabled")(v)}
              disabled={!isAdmin}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Maintenance"
          icon={Shield}
          description="Mode maintenance de la plateforme"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">Mode maintenance</p>
                {settings.maintenanceMode && (
                  <Badge variant="destructive" className="text-xs">Actif</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Désactive l'app mobile pour les clients pendant une maintenance
              </p>
            </div>
            <Switch
              checked={settings.maintenanceMode}
              onCheckedChange={(v) => set("maintenanceMode")(v)}
              disabled={!isAdmin}
            />
          </div>
          <Separator />
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Environnement</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Jatek Platform</Badge>
              <Badge variant="secondary">API v1</Badge>
              <Badge variant="outline">Oujda, Maroc</Badge>
              {me && (
                <Badge variant="outline" className="capitalize">
                  {me.role?.replace("_", " ")}
                </Badge>
              )}
            </div>
          </div>
        </SectionCard>
      </div>
    </AdminLayout>
  );
}

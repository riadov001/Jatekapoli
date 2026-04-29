import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, Globe, Truck, Bell, Shield, CheckCircle2 } from "lucide-react";
import { useBackendMe } from "@workspace/api-client-react";

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
    if (raw) return { ...defaultSettings(), ...JSON.parse(raw) };
  } catch {}
  return defaultSettings();
}

function defaultSettings(): PlatformSettings {
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

function Section({ title, icon: Icon, description, children }: { title: string; icon: React.ElementType; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, suffix }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; suffix?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2 items-center">
        <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="flex-1" />
        {suffix && <span className="text-sm text-muted-foreground whitespace-nowrap">{suffix}</span>}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { data: me } = useBackendMe({});
  const [settings, setSettings] = useState<PlatformSettings>(loadSettings);
  const [saved, setSaved] = useState(false);

  const set = (k: keyof PlatformSettings) => (v: string | boolean) =>
    setSettings((p) => ({ ...p, [k]: v }));

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const isAdmin = me?.role === "super_admin" || me?.role === "admin";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Settings className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Configuration de la plateforme Jatek</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <Alert className="py-2 px-3 flex items-center gap-2 w-auto">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              <AlertDescription className="text-sm">Paramètres sauvegardés</AlertDescription>
            </Alert>
          )}
          <Button onClick={handleSave} disabled={!isAdmin}>Sauvegarder</Button>
        </div>
      </div>

      {!isAdmin && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>Vous avez un accès en lecture seule à ces paramètres. Seuls les super admins et admins peuvent les modifier.</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Informations générales" icon={Globe} description="Nom et coordonnées de la plateforme">
          <Field label="Nom de l'application" value={settings.appName} onChange={set("appName")} placeholder="Jatek" />
          <Field label="Ville principale" value={settings.city} onChange={set("city")} placeholder="Oujda" />
          <Field label="Devise" value={settings.currency} onChange={set("currency")} placeholder="MAD" />
          <Separator />
          <Field label="Email support" value={settings.supportEmail} onChange={set("supportEmail")} type="email" placeholder="support@jatek.ma" />
          <Field label="Téléphone support" value={settings.supportPhone} onChange={set("supportPhone")} type="tel" placeholder="+212600000000" />
        </Section>

        <Section title="Livraison" icon={Truck} description="Paramètres par défaut pour les livraisons">
          <Field label="Frais de livraison par défaut" value={settings.defaultDeliveryFee} onChange={set("defaultDeliveryFee")} type="number" suffix="MAD" />
          <Field label="Rayon de livraison max" value={settings.maxDeliveryRadiusKm} onChange={set("maxDeliveryRadiusKm")} type="number" suffix="km" />
          <Field label="Montant minimum de commande" value={settings.minOrderAmount} onChange={set("minOrderAmount")} type="number" suffix="MAD" />
        </Section>

        <Section title="Notifications" icon={Bell} description="Activation des notifications système">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Notifications de commandes</div>
              <div className="text-xs text-muted-foreground">Alertes SMS à la création/mise à jour des commandes</div>
            </div>
            <Switch
              checked={settings.orderNotificationsEnabled}
              onCheckedChange={(v) => set("orderNotificationsEnabled")(v)}
              disabled={!isAdmin}
            />
          </div>
        </Section>

        <Section title="Maintenance" icon={Shield} description="Mode maintenance de la plateforme">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium flex items-center gap-2">
                Mode maintenance
                {settings.maintenanceMode && <Badge variant="destructive" className="text-xs">Actif</Badge>}
              </div>
              <div className="text-xs text-muted-foreground">Désactive l'app mobile pour les clients pendant une maintenance</div>
            </div>
            <Switch
              checked={settings.maintenanceMode}
              onCheckedChange={(v) => set("maintenanceMode")(v)}
              disabled={!isAdmin}
            />
          </div>
          <Separator />
          <div className="space-y-1.5">
            <div className="text-sm font-medium">Environnement</div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">Node.js {process.versions?.node ?? "—"}</Badge>
              <Badge variant="secondary">API v1</Badge>
              <Badge variant="outline">Oujda, Maroc</Badge>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

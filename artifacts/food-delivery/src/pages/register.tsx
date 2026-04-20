import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Truck, UserPlus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["customer", "driver", "restaurant_owner", "admin"]),
  phone: z.string().optional(),
});

const ROLES = [
  { value: "customer", label: "🛍️ Customer", desc: "Order food from local restaurants" },
  { value: "driver", label: "🏍️ Delivery Driver", desc: "Deliver orders and earn money" },
  { value: "restaurant_owner", label: "🍽️ Restaurant Owner", desc: "List and manage your restaurant" },
];

export default function RegisterPage() {
  const [_, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const registerMutation = useRegister();
  const [rgpd, setRgpd] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);
  const [emailConsent, setEmailConsent] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", role: "customer", phone: "" },
  });

  const onSubmit = (data: z.infer<typeof schema>) => {
    if (!rgpd) {
      toast({ title: "Vous devez accepter la politique de confidentialité pour continuer.", variant: "destructive" });
      return;
    }
    registerMutation.mutate({ data: { ...data, phone: data.phone || undefined } }, {
      onSuccess: (res) => {
        login(res.token, res.user);
        toast({ title: `Welcome to Jatek, ${res.user.name}! 🎉` });
        setLocation("/");
      },
      onError: (err: any) => {
        toast({ title: err?.data?.error || "Registration failed. Please try again.", variant: "destructive" });
      },
    });
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-primary rounded-3xl flex items-center justify-center shadow-lg shadow-primary/30">
              <Truck className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="font-display font-bold text-3xl text-foreground">{t("register.joinJatek")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("register.createFreeAccount")}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-3xl border border-card-border shadow-xl shadow-black/5 p-7"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg">{t("register.createAccountTitle")}</h2>
              <p className="text-xs text-muted-foreground">{t("register.fillInDetails")}</p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("register.fullName")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Mohammed Alami" className="h-12 rounded-xl" data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("register.email")}</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="your@email.com" className="h-12 rounded-xl" data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("register.phone")} <span className="text-muted-foreground font-normal">({t("register.optional")})</span></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">🇲🇦</span>
                        <Input {...field} placeholder="0661234567" className="pl-10 h-12 rounded-xl" data-testid="input-phone" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("register.password")}</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder={t("register.minChars")} className="h-12 rounded-xl" data-testid="input-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("register.iWantToJoinAs")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 rounded-xl" data-testid="select-role">
                          <SelectValue placeholder={t("register.selectRole")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            <div>
                              <span>{r.label}</span>
                              <span className="text-xs text-muted-foreground ml-1">— {r.desc}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Consent checkboxes — use plain divs (not <label>) so the
                  inline links to /legal don't trigger when toggling the box. */}
              <div className="space-y-3 pt-1">
                <div
                  className="flex items-start gap-3 cursor-pointer group"
                  onClick={() => setRgpd(!rgpd)}
                  role="checkbox"
                  aria-checked={rgpd}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setRgpd(!rgpd); } }}
                >
                  <div
                    className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${rgpd ? "bg-primary border-primary" : "border-border group-hover:border-primary/50"}`}
                  >
                    {rgpd && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <span className="text-xs text-foreground leading-relaxed">
                    J'accepte la{" "}
                    <a
                      href="/legal"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-primary underline inline-flex items-center gap-0.5"
                    >
                      politique de confidentialité <ExternalLink className="w-3 h-3" />
                    </a>
                    {" "}et les{" "}
                    <a
                      href="/legal"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-primary underline"
                    >
                      CGU
                    </a>
                    {" "}(obligatoire)
                  </span>
                </div>
                <div
                  className="flex items-start gap-3 cursor-pointer group"
                  onClick={() => setSmsConsent(!smsConsent)}
                  role="checkbox"
                  aria-checked={smsConsent}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setSmsConsent(!smsConsent); } }}
                >
                  <div
                    className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${smsConsent ? "bg-primary border-primary" : "border-border group-hover:border-primary/50"}`}
                  >
                    {smsConsent && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <span className="text-xs text-muted-foreground leading-relaxed">
                    J'accepte de recevoir des SMS promotionnels de Jatek (optionnel)
                  </span>
                </div>
                <div
                  className="flex items-start gap-3 cursor-pointer group"
                  onClick={() => setEmailConsent(!emailConsent)}
                  role="checkbox"
                  aria-checked={emailConsent}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setEmailConsent(!emailConsent); } }}
                >
                  <div
                    className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${emailConsent ? "bg-primary border-primary" : "border-border group-hover:border-primary/50"}`}
                  >
                    {emailConsent && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <span className="text-xs text-muted-foreground leading-relaxed">
                    J'accepte de recevoir la newsletter et des offres par email (optionnel)
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-xl font-semibold text-base shadow-md shadow-primary/20"
                disabled={registerMutation.isPending}
                data-testid="button-submit-register"
              >
                {registerMutation.isPending ? t("register.creatingAccount") : t("register.createAccountBtn")}
              </Button>
            </form>
          </Form>

          <div className="mt-5 pt-5 border-t border-border/60 text-center">
            <p className="text-sm text-muted-foreground">
              {t("register.alreadyHaveAccount")}{" "}
              <button onClick={() => setLocation("/login")} className="text-primary font-semibold hover:underline">
                {t("register.signIn")}
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

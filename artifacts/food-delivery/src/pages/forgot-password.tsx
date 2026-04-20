import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, KeyRound, ArrowLeft, ArrowRight, RefreshCw, Truck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type Step = "email" | "code" | "done";

const RESPONSE_HINT = "Si un compte est associé à cet email et possède un numéro de téléphone, un code a été envoyé par SMS ou WhatsApp.";

const emailSchema = z.object({
  email: z.string().email("Email invalide"),
});

const resetSchema = z.object({
  code: z.string().length(6, "Code à 6 chiffres requis"),
  newPassword: z.string().min(6, "Au moins 6 caractères"),
});

function apiUrl(path: string) {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
  return `${base}/api${path}`;
}

export default function ForgotPasswordPage() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [requesting, setRequesting] = useState(false);
  const [resetting, setResetting] = useState(false);

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const resetForm = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { code: "", newPassword: "" },
  });

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const requestCode = async (targetEmail: string) => {
    setRequesting(true);
    try {
      const res = await fetch(apiUrl("/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur lors de l'envoi du code");

      setEmail(targetEmail);
      setDemoOtp(json.demoOtp ?? null);
      setCountdown(60);
      setStep("code");

      toast({
        title: "Demande enregistrée",
        description: RESPONSE_HINT,
      });
    } catch (err: any) {
      toast({ title: err.message || "Erreur", variant: "destructive" });
    } finally {
      setRequesting(false);
    }
  };

  const handleEmailSubmit = (data: z.infer<typeof emailSchema>) => {
    requestCode(data.email.trim().toLowerCase());
  };

  const handleResend = () => {
    if (email) requestCode(email);
  };

  const handleReset = async (data: z.infer<typeof resetSchema>) => {
    setResetting(true);
    try {
      const res = await fetch(apiUrl("/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: data.code, newPassword: data.newPassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Échec de la réinitialisation");

      if (json.token && json.user) {
        login(json.token, json.user);
      }
      setStep("done");
      toast({ title: "Mot de passe réinitialisé 🎉" });
      setTimeout(() => setLocation("/"), 1500);
    } catch (err: any) {
      toast({ title: err.message || "Erreur", variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  const slideVariants = {
    enter: { x: 40, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -40, opacity: 0 },
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
          <h1 className="font-display font-bold text-3xl text-foreground">Jatek</h1>
          <p className="text-muted-foreground text-sm mt-1">Réinitialiser le mot de passe</p>
        </motion.div>

        <div className="bg-card rounded-3xl border border-card-border shadow-xl shadow-black/5 overflow-hidden">
          <AnimatePresence mode="wait">
            {step === "email" && (
              <motion.div
                key="email"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22 }}
                className="p-7"
              >
                <button
                  onClick={() => setLocation("/login")}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Retour à la connexion
                </button>

                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-lg">Mot de passe oublié ?</h2>
                    <p className="text-xs text-muted-foreground">
                      Nous vous enverrons un code par SMS / WhatsApp
                    </p>
                  </div>
                </div>

                <Form {...emailForm}>
                  <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-4">
                    <FormField
                      control={emailForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email du compte</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="vous@email.com"
                              className="h-12 rounded-xl"
                              data-testid="input-forgot-email"
                              autoFocus
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl font-semibold gap-2 shadow-md shadow-primary/20"
                      disabled={requesting}
                      data-testid="button-send-reset-code"
                    >
                      {requesting ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" /> Envoi…</>
                      ) : (
                        <>Envoyer le code <ArrowRight className="w-4 h-4" /></>
                      )}
                    </Button>
                  </form>
                </Form>
              </motion.div>
            )}

            {step === "code" && (
              <motion.div
                key="code"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22 }}
                className="p-7"
              >
                <button
                  onClick={() => setStep("email")}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Retour
                </button>

                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <KeyRound className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-lg">Entrez le code reçu</h2>
                    <p className="text-xs text-muted-foreground">
                      Si un compte existe avec un téléphone, un code vous a été envoyé.
                    </p>
                  </div>
                </div>

                {demoOtp && (
                  <div className="mb-5 p-3 bg-brand-yellow-soft border border-brand-yellow/40 rounded-xl text-center">
                    <p className="text-xs text-brand-yellow-foreground font-semibold">Mode démo</p>
                    <p className="text-2xl font-bold tracking-widest text-brand-yellow-foreground mt-0.5">{demoOtp}</p>
                  </div>
                )}

                <Form {...resetForm}>
                  <form onSubmit={resetForm.handleSubmit(handleReset)} className="space-y-4">
                    <FormField
                      control={resetForm.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code de vérification</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              inputMode="numeric"
                              maxLength={6}
                              placeholder="123456"
                              className="h-12 rounded-xl tracking-widest text-center text-lg font-bold"
                              data-testid="input-reset-code"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={resetForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nouveau mot de passe</FormLabel>
                          <FormControl>
                            <PasswordInput
                              {...field}
                              placeholder="Au moins 6 caractères"
                              className="h-12 rounded-xl"
                              data-testid="input-new-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl font-semibold gap-2 shadow-md shadow-primary/20"
                      disabled={resetting}
                      data-testid="button-reset-password"
                    >
                      {resetting ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" /> Réinitialisation…</>
                      ) : (
                        <>Réinitialiser <ArrowRight className="w-4 h-4" /></>
                      )}
                    </Button>
                  </form>
                </Form>

                <div className="text-center mt-5">
                  {countdown > 0 ? (
                    <p className="text-sm text-muted-foreground">Renvoyer dans {countdown}s</p>
                  ) : (
                    <button
                      onClick={handleResend}
                      disabled={requesting}
                      className="text-sm text-primary font-medium hover:underline disabled:opacity-50"
                    >
                      {requesting ? "Envoi…" : "Renvoyer le code"}
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {step === "done" && (
              <motion.div
                key="done"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22 }}
                className="p-7 text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-7 h-7 text-green-600" />
                </div>
                <h2 className="font-display font-bold text-lg mb-1">Mot de passe modifié</h2>
                <p className="text-sm text-muted-foreground">
                  Vous êtes maintenant connecté. Redirection…
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

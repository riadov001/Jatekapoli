import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, ArrowRight, ArrowLeft, Truck, RefreshCw, Mail, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSendOtp, useVerifyOtp, useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type Step = "phone" | "otp" | "name" | "email";

const phoneSchema = z.object({
  phone: z.string().min(8, "Enter a valid phone number"),
});

const otpSchema = z.object({
  code: z.string().length(6, "Enter the 6-digit code"),
});

const nameSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
});

const emailSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

function OtpInput({ onComplete, disabled }: { onComplete: (code: string) => void; disabled?: boolean }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, "");
    if (clean.length > 1) {
      const newDigits = [...digits];
      for (let i = 0; i < 6 && i < clean.length; i++) {
        newDigits[index + i] = clean[i] || "";
      }
      setDigits(newDigits);
      const next = Math.min(index + clean.length, 5);
      refs.current[next]?.focus();
      const full = newDigits.join("");
      if (full.length === 6) onComplete(full);
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = clean;
    setDigits(newDigits);

    if (clean && index < 5) {
      refs.current[index + 1]?.focus();
    }

    const full = newDigits.join("");
    if (full.length === 6) onComplete(full);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="w-11 h-14 text-center text-xl font-bold border-2 border-border rounded-xl bg-background focus:border-primary focus:outline-none transition-colors disabled:opacity-50"
        />
      ))}
    </div>
  );
}

export default function LoginPage() {
  const [_, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("phone");
  const [phoneValue, setPhoneValue] = useState("");
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [isSavingName, setIsSavingName] = useState(false);

  const sendOtpMutation = useSendOtp();
  const verifyOtpMutation = useVerifyOtp();
  const loginMutation = useLogin();

  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "" },
  });

  const nameForm = useForm<z.infer<typeof nameSchema>>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: "" },
  });

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const handleSendOtp = (phone: string) => {
    setPhoneValue(phone);
    sendOtpMutation.mutate({ data: { phone } }, {
      onSuccess: (res) => {
        setDemoOtp(res.demoOtp ?? null);
        setCountdown(60);
        setStep("otp");
      },
      onError: (err: any) => {
        toast({ title: err?.data?.error || "Could not send OTP. Try again.", variant: "destructive" });
      },
    });
  };

  const handleVerifyOtp = (code: string) => {
    verifyOtpMutation.mutate({ data: { phone: phoneValue, code } }, {
      onSuccess: (res) => {
        // Always store the token/user immediately so it can be used for name update
        login(res.token, res.user as any);

        if ((res as any).isNewUser || res.user.name.startsWith("User ")) {
          // New user — ask for their name before proceeding
          setStep("name");
        } else {
          toast({ title: `Welcome back, ${res.user.name}! 🎉` });
          setLocation("/");
        }
      },
      onError: (err: any) => {
        toast({ title: err?.data?.error || "Invalid OTP. Try again.", variant: "destructive" });
      },
    });
  };

  // For new users: update name via PATCH /auth/update-name using the token just stored
  const handleSaveName = async (data: z.infer<typeof nameSchema>) => {
    setIsSavingName(true);
    try {
      const token = localStorage.getItem("tawsila_token");
      const apiBase = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
      const response = await fetch(`${apiBase}/api/auth/update-name`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: data.name }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Could not save name");

      // Update user in auth context with the new name
      login(token!, json.user);
      toast({ title: `Welcome to Tawsila, ${json.user.name}! 🎉` });
      setLocation("/");
    } catch (err: any) {
      toast({ title: err.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setIsSavingName(false);
    }
  };

  const handleEmailLogin = (data: z.infer<typeof emailSchema>) => {
    loginMutation.mutate({ data }, {
      onSuccess: (res) => {
        login(res.token, res.user as any);
        toast({ title: `Welcome back, ${res.user.name}!` });
        setLocation("/");
      },
      onError: () => {
        toast({ title: "Invalid email or password", variant: "destructive" });
      },
    });
  };

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">

        {/* Logo + Brand */}
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
          <h1 className="font-display font-bold text-3xl text-foreground">Tawsila</h1>
          <p className="text-muted-foreground text-sm mt-1">Fast delivery in Oujda</p>
        </motion.div>

        {/* Card */}
        <div className="bg-card rounded-3xl border border-card-border shadow-xl shadow-black/5 overflow-hidden">

          <AnimatePresence mode="wait" custom={1}>
            {/* Step: Phone */}
            {step === "phone" && (
              <motion.div
                key="phone"
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="p-7"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-lg">Enter your number</h2>
                    <p className="text-xs text-muted-foreground">We'll send you a verification code</p>
                  </div>
                </div>

                <Form {...phoneForm}>
                  <form onSubmit={phoneForm.handleSubmit((d) => handleSendOtp(d.phone))} className="space-y-4">
                    <FormField
                      control={phoneForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Phone number</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">🇲🇦</span>
                              <Input
                                {...field}
                                type="tel"
                                placeholder="06 12 34 56 78"
                                className="pl-10 h-12 text-base rounded-xl"
                                data-testid="input-phone"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl font-semibold text-base gap-2 shadow-md shadow-primary/20"
                      disabled={sendOtpMutation.isPending}
                    >
                      {sendOtpMutation.isPending ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" /> Sending…</>
                      ) : (
                        <>Continue <ArrowRight className="w-4 h-4" /></>
                      )}
                    </Button>
                  </form>
                </Form>

                <div className="mt-5 pt-5 border-t border-border/60">
                  <button
                    onClick={() => setStep("email")}
                    className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    <Mail className="w-4 h-4" />
                    Sign in with email instead
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step: OTP */}
            {step === "otp" && (
              <motion.div
                key="otp"
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="p-7"
              >
                <button
                  onClick={() => setStep("phone")}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>

                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <KeyRound className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="font-display font-bold text-lg">Enter the code</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sent to <span className="font-semibold text-foreground">{phoneValue}</span>
                  </p>
                </div>

                {demoOtp && (
                  <div className="mb-5 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-center">
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Demo mode — your OTP:</p>
                    <p className="text-2xl font-bold tracking-widest text-amber-600 dark:text-amber-300 mt-0.5">{demoOtp}</p>
                  </div>
                )}

                <OtpInput
                  onComplete={handleVerifyOtp}
                  disabled={verifyOtpMutation.isPending}
                />

                {verifyOtpMutation.isPending && (
                  <p className="text-center text-sm text-muted-foreground mt-4 flex items-center justify-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying…
                  </p>
                )}

                <div className="text-center mt-5">
                  {countdown > 0 ? (
                    <p className="text-sm text-muted-foreground">Resend in <span className="font-semibold text-foreground">{countdown}s</span></p>
                  ) : (
                    <button
                      onClick={() => handleSendOtp(phoneValue)}
                      disabled={sendOtpMutation.isPending}
                      className="text-sm text-primary font-medium hover:underline disabled:opacity-50"
                    >
                      {sendOtpMutation.isPending ? "Sending…" : "Resend code"}
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step: Name (new users) */}
            {step === "name" && (
              <motion.div
                key="name"
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="p-7"
              >
                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">🎉</span>
                  </div>
                  <h2 className="font-display font-bold text-lg">Almost there!</h2>
                  <p className="text-sm text-muted-foreground mt-1">What should we call you?</p>
                </div>

                <Form {...nameForm}>
                  <form onSubmit={nameForm.handleSubmit(handleSaveName)} className="space-y-4">
                    <FormField
                      control={nameForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Mohammed Alami" className="h-12 rounded-xl" autoFocus />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl font-semibold gap-2 shadow-md shadow-primary/20"
                      disabled={isSavingName}
                    >
                      {isSavingName ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</> : <>Start ordering <ArrowRight className="w-4 h-4" /></>}
                    </Button>
                  </form>
                </Form>
              </motion.div>
            )}

            {/* Step: Email (fallback) */}
            {step === "email" && (
              <motion.div
                key="email"
                custom={-1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="p-7"
              >
                <button
                  onClick={() => setStep("phone")}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>

                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-lg">Sign in with email</h2>
                    <p className="text-xs text-muted-foreground">Use your account credentials</p>
                  </div>
                </div>

                <Form {...emailForm}>
                  <form onSubmit={emailForm.handleSubmit(handleEmailLogin)} className="space-y-4">
                    <FormField
                      control={emailForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="your@email.com" className="h-12 rounded-xl" data-testid="input-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={emailForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" placeholder="••••••••" className="h-12 rounded-xl" data-testid="input-password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl font-semibold gap-2 shadow-md shadow-primary/20"
                      disabled={loginMutation.isPending}
                      data-testid="button-submit-login"
                    >
                      {loginMutation.isPending ? "Signing in…" : "Sign in"}
                    </Button>
                  </form>
                </Form>

                <div className="mt-4 p-3.5 bg-muted/60 rounded-xl text-xs text-muted-foreground space-y-0.5">
                  <p className="font-semibold mb-1 text-foreground/70">Demo accounts:</p>
                  <p>Customer: customer@tawsila.ma / password123</p>
                  <p>Driver: driver@tawsila.ma / password123</p>
                  <p>Admin: admin@tawsila.ma / password123</p>
                  <p>Restaurant: owner@tawsila.ma / password123</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {step === "phone" && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center text-sm text-muted-foreground mt-5"
          >
            New here?{" "}
            <button onClick={() => setLocation("/register")} className="text-primary font-semibold hover:underline" data-testid="link-register">
              Create account
            </button>
          </motion.p>
        )}
      </div>
    </div>
  );
}

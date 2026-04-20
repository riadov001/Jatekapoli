import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { I18nManager } from "react-native";
import { translations, type Lang, type TKey } from "@/lib/translations";
import { fetchNotifPrefs, updateNotifPrefs } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY = "jatek_lang_v1";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => Promise<void>;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
  isRTL: boolean;
}

const Ctx = createContext<LangCtx | null>(null);

function format(str: string, vars?: Record<string, string | number>) {
  if (!vars) return str;
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), str);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [lang, setLangState] = useState<Lang>("fr");

  // Hydrate from local storage immediately, then reconcile with backend.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === "fr" || v === "en" || v === "ar") setLangState(v);
    });
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchNotifPrefs()
      .then((p) => {
        const v = p.language;
        if (v === "fr" || v === "en" || v === "ar") {
          setLangState(v);
          AsyncStorage.setItem(STORAGE_KEY, v).catch(() => {});
        }
      })
      .catch(() => {});
  }, [token]);

  // Apply RTL hint (Arabic). We don't force a reload to avoid breaking
  // an in-flight session; the layout direction takes effect on next launch.
  useEffect(() => {
    const wantRTL = lang === "ar";
    if (I18nManager.isRTL !== wantRTL) {
      try { I18nManager.allowRTL(wantRTL); } catch {}
    }
  }, [lang]);

  const setLang = useCallback(async (l: Lang) => {
    setLangState(l);
    await AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {});
    if (token) {
      try { await updateNotifPrefs({ language: l }); } catch {}
    }
  }, [token]);

  const t = useCallback((key: TKey, vars?: Record<string, string | number>) => {
    const dict = translations[lang] ?? translations.fr;
    const raw = (dict as any)[key] ?? (translations.fr as any)[key] ?? key;
    return format(raw, vars);
  }, [lang]);

  return (
    <Ctx.Provider value={{ lang, setLang, t, isRTL: lang === "ar" }}>
      {children}
    </Ctx.Provider>
  );
}

export function useLang() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}

export function useT() {
  return useLang().t;
}

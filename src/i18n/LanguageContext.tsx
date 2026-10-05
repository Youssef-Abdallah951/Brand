import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Lang } from "../lib/types";

const LanguageContext = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  dir: "rtl" | "ltr";
}>({ lang: "ar", setLang: () => {}, dir: "rtl" });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem("lumiere_lang");
      return saved === "en" || saved === "ar" ? saved : "ar";
    } catch {
      return "ar";
    }
  });
  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("lumiere_lang", l);
    } catch { /* noop */ }
  };
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.title =
      lang === "ar"
        ? "لوميير بيوتي | مستحضرات تجميل مصرية فاخرة"
        : "LUMIÈRE Beauty | Premium Egyptian Cosmetics";
  }, [lang]);
  return (
    <LanguageContext.Provider value={{ lang, setLang, dir: lang === "ar" ? "rtl" : "ltr" }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);

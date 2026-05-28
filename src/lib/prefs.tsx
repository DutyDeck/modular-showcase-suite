import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";
export type Locale = "en" | "si" | "ta" | "fr";
export type Currency = "USD" | "LKR" | "INR" | "EUR" | "GBP";

const STORAGE_KEY = "oneedu.prefs.v1";

interface Prefs {
  theme: Theme;
  locale: Locale;
  currency: Currency;
}

const defaults: Prefs = {
  theme: "light",
  locale: "en",
  currency: "USD",
};

interface PrefsContextValue extends Prefs {
  setTheme: (t: Theme) => void;
  setLocale: (l: Locale) => void;
  setCurrency: (c: Currency) => void;
  t: (key: string, fallback?: string) => string;
  formatMoney: (usd: number) => string;
}

const PrefsContext = createContext<PrefsContextValue | null>(null);

/* -------- minimal dictionary (English source, others stubbed) -------- */
const DICT: Record<Locale, Record<string, string>> = {
  en: {},
  si: {
    Dashboard: "පුවරුව",
    Students: "ශිෂ්‍යයින්",
    Courses: "පාඨමාලා",
    Attendance: "පැමිණීම",
    "Learning (LMS)": "ඉගෙනීම",
    Assignments: "පැවරුම්",
    Grades: "ලකුණු",
    "My Classes": "මගේ පන්ති",
    Grading: "ලකුණු දැමීම",
    "My Children": "මගේ දරුවන්",
    "Fees & Invoices": "ගාස්තු",
    "Financial Mgmt": "මූල්‍ය කළමනාකරණය",
    "Marketing & CRM": "අලෙවිකරණය",
    Marketplace: "වෙළඳපොළ",
    Messages: "පණිවිඩ",
    "AI Insights": "AI තීක්ෂණ ඥාන",
    "Reports & BI": "වාර්තා",
    Tenants: "කොටස්කරුවන්",
    "Users & Roles": "පරිශීලකයන්",
    "Migration & Imports": "ආගමනය",
    "Compliance & Audit": "අනුකූලතාව",
    "My Profile": "පැතිකඩ",
    Settings: "සැකසුම්",
  },
  ta: {
    Dashboard: "டாஷ்போர்டு",
    Students: "மாணவர்கள்",
    Courses: "பாடநெறிகள்",
    Attendance: "வருகை",
    "Learning (LMS)": "கற்றல்",
    Assignments: "பணிகள்",
    Grades: "தரங்கள்",
    "My Classes": "எனது வகுப்புகள்",
    Grading: "மதிப்பீடு",
    "My Children": "எனது குழந்தைகள்",
    "Fees & Invoices": "கட்டணம்",
    "Financial Mgmt": "நிதி நிர்வாகம்",
    "Marketing & CRM": "சந்தைப்படுத்தல்",
    Marketplace: "சந்தை",
    Messages: "செய்திகள்",
    "AI Insights": "AI நுண்ணறிவு",
    "Reports & BI": "அறிக்கைகள்",
    Tenants: "வாடகையாளர்கள்",
    "Users & Roles": "பயனர்கள்",
    "Migration & Imports": "இடம்பெயர்வு",
    "Compliance & Audit": "இணக்கம்",
    "My Profile": "சுயவிவரம்",
    Settings: "அமைப்புகள்",
  },
  fr: {
    Dashboard: "Tableau de bord",
    Students: "Étudiants",
    Courses: "Cours",
    Attendance: "Présence",
    "Learning (LMS)": "Apprentissage",
    Assignments: "Devoirs",
    Grades: "Notes",
    "My Classes": "Mes classes",
    Grading: "Notation",
    "My Children": "Mes enfants",
    "Fees & Invoices": "Factures",
    "Financial Mgmt": "Gestion financière",
    "Marketing & CRM": "Marketing",
    Marketplace: "Marketplace",
    Messages: "Messages",
    "AI Insights": "Insights IA",
    "Reports & BI": "Rapports",
    Tenants: "Locataires",
    "Users & Roles": "Utilisateurs",
    "Migration & Imports": "Migration",
    "Compliance & Audit": "Conformité",
    "My Profile": "Profil",
    Settings: "Paramètres",
  },
};

export const LOCALE_LABEL: Record<Locale, string> = {
  en: "English",
  si: "සිංහල",
  ta: "தமிழ்",
  fr: "Français",
};

export const CURRENCY_LABEL: Record<Currency, string> = {
  USD: "USD · $",
  LKR: "LKR · Rs",
  INR: "INR · ₹",
  EUR: "EUR · €",
  GBP: "GBP · £",
};

// Rough static rates (USD = 1.00). Realistic enough for a demo.
const USD_RATES: Record<Currency, number> = {
  USD: 1,
  LKR: 305,
  INR: 84,
  EUR: 0.92,
  GBP: 0.79,
};

const CURRENCY_LOCALE: Record<Currency, string> = {
  USD: "en-US",
  LKR: "en-LK",
  INR: "en-IN",
  EUR: "de-DE",
  GBP: "en-GB",
};

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  root.style.colorScheme = theme;
}

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    return defaults;
  }
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => loadPrefs().theme);
  const [locale, setLocaleState] = useState<Locale>(() => loadPrefs().locale);
  const [currency, setCurrencyState] = useState<Currency>(() => loadPrefs().currency);

  // Apply theme immediately on mount + when it changes.
  useEffect(() => applyTheme(theme), [theme]);

  const save = (next: Prefs) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const value: PrefsContextValue = useMemo(() => {
    const setTheme = (t: Theme) => {
      setThemeState(t);
      save({ theme: t, locale, currency });
    };
    const setLocale = (l: Locale) => {
      setLocaleState(l);
      save({ theme, locale: l, currency });
    };
    const setCurrency = (c: Currency) => {
      setCurrencyState(c);
      save({ theme, locale, currency: c });
    };
    const t = (key: string, fallback?: string) =>
      DICT[locale]?.[key] ?? fallback ?? key;
    const formatMoney = (usd: number) => {
      const v = usd * USD_RATES[currency];
      try {
        return new Intl.NumberFormat(CURRENCY_LOCALE[currency], {
          style: "currency",
          currency,
          maximumFractionDigits: currency === "LKR" || currency === "INR" ? 0 : 2,
        }).format(v);
      } catch {
        return `${currency} ${v.toFixed(0)}`;
      }
    };
    return { theme, locale, currency, setTheme, setLocale, setCurrency, t, formatMoney };
  }, [theme, locale, currency]);

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used within PrefsProvider");
  return ctx;
}

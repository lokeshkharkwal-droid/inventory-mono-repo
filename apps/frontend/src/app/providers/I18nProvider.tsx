import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/** Supported locales (7), with RTL flagged. */
export const LOCALES = [
  { code: 'en', label: 'English', rtl: false },
  { code: 'es', label: 'Español', rtl: false },
  { code: 'fr', label: 'Français', rtl: false },
  { code: 'de', label: 'Deutsch', rtl: false },
  { code: 'pt', label: 'Português', rtl: false },
  { code: 'hi', label: 'हिन्दी', rtl: false },
  { code: 'ar', label: 'العربية', rtl: true },
] as const;

export type LocaleCode = (typeof LOCALES)[number]['code'];

/**
 * Lightweight i18n dictionary. Keys fall back to English (and then to the key
 * itself) when a locale is missing a string — so untranslated UI stays usable
 * while translations are filled in. Covers the app shell + common actions;
 * extend per feature as needed.
 */
const DICT: Record<string, Partial<Record<LocaleCode, string>>> = {
  // Shell
  'app.title': { en: 'Inventory', es: 'Inventario', fr: 'Inventaire', de: 'Inventar', pt: 'Inventário', hi: 'इन्वेंट्री', ar: 'المخزون' },
  'app.logout': { en: 'Log out', es: 'Cerrar sesión', fr: 'Déconnexion', de: 'Abmelden', pt: 'Sair', hi: 'लॉग आउट', ar: 'تسجيل خروج' },
  // Nav groups
  'nav.Overview': { en: 'Overview', es: 'Resumen', fr: 'Aperçu', de: 'Übersicht', pt: 'Visão geral', hi: 'अवलोकन', ar: 'نظرة عامة' },
  'nav.Catalog': { en: 'Catalog', es: 'Catálogo', fr: 'Catalogue', de: 'Katalog', pt: 'Catálogo', hi: 'सूची', ar: 'الكتالوج' },
  'nav.Purchasing': { en: 'Purchasing', es: 'Compras', fr: 'Achats', de: 'Einkauf', pt: 'Compras', hi: 'खरीद', ar: 'المشتريات' },
  'nav.Sales': { en: 'Sales', es: 'Ventas', fr: 'Ventes', de: 'Verkauf', pt: 'Vendas', hi: 'बिक्री', ar: 'المبيعات' },
  'nav.Operations': { en: 'Operations', es: 'Operaciones', fr: 'Opérations', de: 'Betrieb', pt: 'Operações', hi: 'संचालन', ar: 'العمليات' },
  'nav.Clinical': { en: 'Clinical', es: 'Clínico', fr: 'Clinique', de: 'Klinik', pt: 'Clínico', hi: 'क्लिनिकल', ar: 'سريري' },
  'nav.Finance': { en: 'Finance', es: 'Finanzas', fr: 'Finances', de: 'Finanzen', pt: 'Finanças', hi: 'वित्त', ar: 'المالية' },
  'nav.Reports': { en: 'Reports', es: 'Informes', fr: 'Rapports', de: 'Berichte', pt: 'Relatórios', hi: 'रिपोर्ट', ar: 'التقارير' },
  'nav.System': { en: 'System', es: 'Sistema', fr: 'Système', de: 'System', pt: 'Sistema', hi: 'सिस्टम', ar: 'النظام' },
  // Common actions
  'common.save': { en: 'Save', es: 'Guardar', fr: 'Enregistrer', de: 'Speichern', pt: 'Salvar', hi: 'सहेजें', ar: 'حفظ' },
  'common.cancel': { en: 'Cancel', es: 'Cancelar', fr: 'Annuler', de: 'Abbrechen', pt: 'Cancelar', hi: 'रद्द करें', ar: 'إلغاء' },
  'common.search': { en: 'Search…', es: 'Buscar…', fr: 'Rechercher…', de: 'Suchen…', pt: 'Pesquisar…', hi: 'खोजें…', ar: 'بحث…' },
};

const STORAGE_KEY = 'inv_locale';

interface I18nValue {
  locale: LocaleCode;
  setLocale: (l: LocaleCode) => void;
  dir: 'ltr' | 'rtl';
  t: (key: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

function initialLocale(): LocaleCode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as LocaleCode | null;
    if (stored && LOCALES.some((l) => l.code === stored)) return stored;
  } catch {
    /* ignore */
  }
  return 'en';
}

/** App-wide i18n + document direction (RTL) provider. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(initialLocale);
  const dir: 'ltr' | 'rtl' = LOCALES.find((l) => l.code === locale)?.rtl
    ? 'rtl'
    : 'ltr';

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  const setLocale = useCallback((l: LocaleCode) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: string) => DICT[key]?.[locale] ?? DICT[key]?.en ?? key,
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, dir, t }),
    [locale, setLocale, dir, t],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Access the current locale + `t()` translator. */
export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

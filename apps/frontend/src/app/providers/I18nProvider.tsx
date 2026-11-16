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
  'nav.Product': { en: 'Product', es: 'Producto', fr: 'Produit', de: 'Produkt', pt: 'Produto', hi: 'उत्पाद', ar: 'منتج' },
  'nav.Catalog': { en: 'Catalog', es: 'Catálogo', fr: 'Catalogue', de: 'Katalog', pt: 'Catálogo', hi: 'सूची', ar: 'الكتالوج' },
  'nav.Purchasing': { en: 'Purchasing', es: 'Compras', fr: 'Achats', de: 'Einkauf', pt: 'Compras', hi: 'खरीद', ar: 'المشتريات' },
  'nav.Sales': { en: 'Sales', es: 'Ventas', fr: 'Ventes', de: 'Verkauf', pt: 'Vendas', hi: 'बिक्री', ar: 'المبيعات' },
  'nav.Purchases': { en: 'Purchases', es: 'Compras', fr: 'Achats', de: 'Einkauf', pt: 'Compras', hi: 'खरीद', ar: 'المشتريات' },
  'nav.Parties': { en: 'Parties', es: 'Terceros', fr: 'Tiers', de: 'Partner', pt: 'Terceiros', hi: 'पक्ष', ar: 'الأطراف' },
  'nav.Quotations': { en: 'Quotations', es: 'Cotizaciones', fr: 'Devis', de: 'Angebote', pt: 'Cotações', hi: 'उद्धरण', ar: 'عروض الأسعار' },
  'nav.Operations': { en: 'Operations', es: 'Operaciones', fr: 'Opérations', de: 'Betrieb', pt: 'Operações', hi: 'संचालन', ar: 'العمليات' },
  'nav.Requisition': { en: 'Requisition', es: 'Requisición', fr: 'Réquisition', de: 'Anforderung', pt: 'Requisição', hi: 'अधियाचना', ar: 'طلب' },
  'nav.Clinical': { en: 'Clinical', es: 'Clínico', fr: 'Clinique', de: 'Klinik', pt: 'Clínico', hi: 'क्लिनिकल', ar: 'سريري' },
  'nav.Finance': { en: 'Finance', es: 'Finanzas', fr: 'Finances', de: 'Finanzen', pt: 'Finanças', hi: 'वित्त', ar: 'المالية' },
  'nav.Reports': { en: 'Reports', es: 'Informes', fr: 'Rapports', de: 'Berichte', pt: 'Relatórios', hi: 'रिपोर्ट', ar: 'التقارير' },
  'nav.System': { en: 'System', es: 'Sistema', fr: 'Système', de: 'System', pt: 'Sistema', hi: 'सिस्टम', ar: 'النظام' },
  // Nav groups — EZ Health Track sidebar parity
  'nav.Dashboard': { en: 'Dashboard', es: 'Panel', fr: 'Tableau de bord', de: 'Dashboard', pt: 'Painel', hi: 'डैशबोर्ड', ar: 'لوحة التحكم' },
  'nav.Proformas': { en: 'Proformas', es: 'Proformas', fr: 'Proformas', de: 'Proformas', pt: 'Proformas', hi: 'प्रोफ़ॉर्मा', ar: 'الفواتير المبدئية' },
  'nav.People': { en: 'People', es: 'Personas', fr: 'Personnes', de: 'Personen', pt: 'Pessoas', hi: 'लोग', ar: 'الأشخاص' },
  'nav.Materials': { en: 'Materials', es: 'Materiales', fr: 'Matériaux', de: 'Materialien', pt: 'Materiais', hi: 'सामग्री', ar: 'المواد' },
  'nav.Quotes': { en: 'Quotes', es: 'Cotizaciones', fr: 'Devis', de: 'Angebote', pt: 'Cotações', hi: 'उद्धरण', ar: 'عروض الأسعار' },
  'nav.Requisitions': { en: 'Requisitions', es: 'Requisiciones', fr: 'Réquisitions', de: 'Anforderungen', pt: 'Requisições', hi: 'अधियाचनाएँ', ar: 'الطلبات' },
  'nav.Transfers': { en: 'Transfers', es: 'Transferencias', fr: 'Transferts', de: 'Transfers', pt: 'Transferências', hi: 'स्थानांतरण', ar: 'التحويلات' },
  'nav.Expenses': { en: 'Expenses', es: 'Gastos', fr: 'Dépenses', de: 'Ausgaben', pt: 'Despesas', hi: 'व्यय', ar: 'المصروفات' },
  'nav.Incomes': { en: 'Incomes', es: 'Ingresos', fr: 'Revenus', de: 'Einnahmen', pt: 'Receitas', hi: 'आय', ar: 'الإيرادات' },
  'nav.Settings': { en: 'Settings', es: 'Ajustes', fr: 'Paramètres', de: 'Einstellungen', pt: 'Configurações', hi: 'सेटिंग्स', ar: 'الإعدادات' },
  'nav.Blood Bank': { en: 'Blood Bank', es: 'Banco de sangre', fr: 'Banque de sang', de: 'Blutbank', pt: 'Banco de sangue', hi: 'ब्लड बैंक', ar: 'بنك الدم' },
  'nav.IPD': { en: 'IPD', es: 'Hospitalización', fr: 'Hospitalisation', de: 'Stationär', pt: 'Internação', hi: 'आईपीडी', ar: 'التنويم' },
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

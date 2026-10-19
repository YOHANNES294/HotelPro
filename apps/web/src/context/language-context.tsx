'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { SupportedLocale, TRANSLATIONS, TranslationDictionary } from '@hotelpro/shared';

interface LanguageContextType {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  toggleLocale: () => void;
  t: TranslationDictionary;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>('en');

  useEffect(() => {
    const saved = localStorage.getItem('hotelpro_locale') as SupportedLocale;
    if (saved && (saved === 'en' || saved === 'am')) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    localStorage.setItem('hotelpro_locale', newLocale);
  };

  const toggleLocale = () => {
    const next = locale === 'en' ? 'am' : 'en';
    setLocale(next);
  };

  const t = TRANSLATIONS[locale] || TRANSLATIONS.en;

  return (
    <LanguageContext.Provider value={{ locale, setLocale, toggleLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

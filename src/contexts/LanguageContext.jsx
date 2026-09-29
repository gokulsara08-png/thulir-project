import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getTranslation, getSavedLanguage, saveLanguage, LANGUAGES } from '../i18n';

const LanguageContext = createContext(null);

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getSavedLanguage());

  const setLanguage = useCallback((lang) => {
    setLanguageState(lang);
    saveLanguage(lang);
    document.documentElement.lang = lang;
  }, []);

  const t = useCallback((key) => {
    return getTranslation(language, key);
  }, [language]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

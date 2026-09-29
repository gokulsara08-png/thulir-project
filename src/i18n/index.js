// Internationalization system for THULIR
import { en } from './locales/en';
import { ta } from './locales/ta';
import { hi } from './locales/hi';
import { ml } from './locales/ml';
import { te } from './locales/te';
import { kn } from './locales/kn';

const locales = { en, ta, hi, ml, te, kn };

export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' }
];

export function getTranslation(lang, key) {
  const keys = key.split('.');
  let value = locales[lang];
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback to English
      let fallback = locales['en'];
      for (const fk of keys) {
        if (fallback && typeof fallback === 'object' && fk in fallback) {
          fallback = fallback[fk];
        } else {
          return key; // Return key if not found in fallback either
        }
      }
      return fallback;
    }
  }
  return value || key;
}

export function getSavedLanguage() {
  return localStorage.getItem('thulir_language') || 'en';
}

export function saveLanguage(lang) {
  localStorage.setItem('thulir_language', lang);
}

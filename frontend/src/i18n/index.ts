import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import fil from './fil.json';
import ceb from './ceb.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fil: { translation: fil },
    ceb: { translation: ceb },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;

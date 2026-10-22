import { setLanguage } from '../i18n/index.js';
import { refresh } from './navigation.js';
import { setCityPreference, setLanguagePreference } from '../store.js';

export function applyLanguage(language) {
  setLanguagePreference(language);
  setLanguage(language);
  refresh();
}

export function applyCity(cityId) {
  setCityPreference(cityId);
  refresh();
}

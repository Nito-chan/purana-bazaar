import { getStoredCityId, getStoredLang, setStoredCityId, setStoredLang } from './lib/storage.js';

const listeners = new Set();

const state = {
  ready: false,
  route: 'home',
  language: getStoredLang() || 'en',
  cityId: getStoredCityId() || 'city-khargone',
  categories: [],
  cities: [],
  auth: { status: 'anonymous', user: null, profile: null },
  unreadNotifications: 0,
  unreadChats: 0,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
};

function emit() {
  for (const listener of listeners) {
    try {
      listener(state);
    } catch {
      // A broken subscriber must never stop the rest of the app from updating.
    }
  }
}

export const store = {
  getState() {
    return state;
  },

  setState(patch) {
    if (!patch || typeof patch !== 'object') return state;
    let changed = false;
    for (const [key, value] of Object.entries(patch)) {
      if (Object.is(state[key], value)) continue;
      state[key] = value;
      changed = true;
    }
    if (changed) emit();
    return state;
  },

  subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function setCityPreference(cityId) {
  setStoredCityId(cityId || null);
  store.setState({ cityId: cityId || null });
}

export function setLanguagePreference(language) {
  const next = language === 'hi' ? 'hi' : 'en';
  setStoredLang(next);
  store.setState({ language: next });
}

export function categoryById(categories, id) {
  return categories.find((category) => category.id === id) || null;
}

export function categoryBySlug(categories, slug) {
  return categories.find((category) => category.slug === slug) || null;
}

export function cityById(cities, id) {
  return cities.find((city) => city.id === id) || null;
}

export function cityBySlug(cities, slug) {
  const target = String(slug ?? '').toLowerCase();
  return cities.find((city) => city.slug.toLowerCase() === target) || null;
}

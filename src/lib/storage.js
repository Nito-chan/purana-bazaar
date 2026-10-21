const KEYS = {
  city: 'pb.cityId',
  lang: 'pb.lang',
  draft: 'pb.sellDraft',
  recent: 'pb.recentlyViewed',
  banners: 'pb.dismissedBanners',
};

function read(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    if (value === null || value === undefined || value === '') window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, String(value));
  } catch {
    // Storage can be unavailable in private mode. The app still works in memory.
  }
}

function readJson(key, fallback) {
  const raw = read(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    write(key, JSON.stringify(value));
  } catch {
    // Ignore quota and serialization failures.
  }
}

export function getStoredCityId() {
  return read(KEYS.city) || null;
}

export function setStoredCityId(cityId) {
  write(KEYS.city, cityId);
}

export function getStoredLang() {
  const value = read(KEYS.lang);
  return value === 'hi' || value === 'en' ? value : null;
}

export function setStoredLang(lang) {
  if (lang === 'hi' || lang === 'en') write(KEYS.lang, lang);
}

export function getSellDraft() {
  const draft = readJson(KEYS.draft, null);
  return draft && typeof draft === 'object' ? draft : null;
}

export function saveSellDraft(draft) {
  if (!draft || typeof draft !== 'object') return;
  writeJson(KEYS.draft, { ...draft, savedAt: new Date().toISOString() });
}

export function clearSellDraft() {
  write(KEYS.draft, null);
}

export function getRecentlyViewed() {
  const list = readJson(KEYS.recent, []);
  return Array.isArray(list) ? list.filter((id) => typeof id === 'string').slice(0, 12) : [];
}

export function addRecentlyViewed(listingId) {
  if (!listingId) return;
  const next = [listingId, ...getRecentlyViewed().filter((id) => id !== listingId)].slice(0, 12);
  writeJson(KEYS.recent, next);
}

export function getDismissedBanners() {
  const list = readJson(KEYS.banners, []);
  return Array.isArray(list) ? list.filter((id) => typeof id === 'string') : [];
}

export function dismissBanner(id) {
  if (!id) return;
  const next = Array.from(new Set([...getDismissedBanners(), id]));
  writeJson(KEYS.banners, next);
}

export const storageKeys = Object.freeze(KEYS);

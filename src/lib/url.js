const SAFE_IMAGE_PROTOCOLS = new Set(['http:', 'https:', 'blob:']);

export function safeImageUrl(value, fallback = '') {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;

  if (raw.startsWith('data:')) {
    return /^data:image\/(png|jpe?g|webp|gif|svg\+xml);/i.test(raw) ? raw : fallback;
  }

  try {
    const url = new URL(raw, window.location.origin);
    if (!SAFE_IMAGE_PROTOCOLS.has(url.protocol)) return fallback;
    return url.href;
  } catch {
    return fallback;
  }
}

export function buildQuery(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '' || value === false) continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

export function slugify(value) {
  const slug = String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/g, '');
  return slug || 'listing';
}

export function parseListingId(value) {
  const raw = String(value ?? '').trim();
  const match = raw.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:-|$)/i);
  return match ? match[1] : raw;
}

export function listingPath(listing) {
  return `/l/${listing.id}-${slugify(listing.title)}`;
}

export function cityCategoryPath(citySlug, categorySlug) {
  return `/${encodeURIComponent(citySlug)}/${encodeURIComponent(categorySlug)}`;
}

export function isSafeNext(value) {
  const next = String(value ?? '');
  if (!next.startsWith('/') || next.startsWith('//')) return false;
  if (next.includes('\\') || /[\u0000-\u001f]/.test(next)) return false;
  return true;
}

export function safeNext(value, fallback = '/') {
  return isSafeNext(value) ? value : fallback;
}

export function absoluteUrl(path = '/') {
  try {
    return new URL(path, window.location.origin).href;
  } catch {
    return window.location.href;
  }
}

export function currentPath() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function addQuery(path, updates = {}) {
  const url = new URL(path, window.location.origin);
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined || value === '') url.searchParams.delete(key);
    else url.searchParams.set(key, String(value));
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export function parseQuery(search = window.location.search) {
  return new URLSearchParams(search);
}

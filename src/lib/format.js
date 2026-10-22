const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const NUMBER = new Intl.NumberFormat('en-IN');

export function formatPrice(value) {
  const amount = Number(value);
  return INR.format(Number.isFinite(amount) ? amount : 0);
}

export function formatNumber(value) {
  return NUMBER.format(Number(value) || 0);
}

export function formatPriceInput(value) {
  const digits = String(value ?? '').replace(/[^\d]/g, '');
  if (!digits) return '';
  return NUMBER.format(Number(digits));
}

export function parsePriceInput(value) {
  const digits = String(value ?? '').replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}

export function formatRelativeTime(iso, lang = 'en') {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = date.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const minutes = Math.round(diffMs / 60000);
  const hours = Math.round(diffMs / 3600000);
  const days = Math.round(diffMs / 86400000);
  const weeks = Math.round(diffMs / 604800000);
  const months = Math.round(diffMs / 2629800000);
  const years = Math.round(diffMs / 31557600000);

  if (abs < 45000) return lang === 'hi' ? 'अभी' : 'Just now';

  const rtf = new Intl.RelativeTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-IN', {
    numeric: 'auto',
  });

  if (abs < 3600000) return rtf.format(minutes, 'minute');
  if (abs < 86400000) return rtf.format(hours, 'hour');
  if (abs < 604800000) return rtf.format(days, 'day');
  if (abs < 2629800000) return rtf.format(weeks, 'week');
  if (abs < 31557600000) return rtf.format(months, 'month');
  return rtf.format(years, 'year');
}

export function formatDate(iso, lang = 'en') {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatShortDate(iso, lang = 'en') {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

export function formatTime(iso, lang = 'en') {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatPhone(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  if (local.length !== 10) return String(phone ?? '');
  return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
}

export function initials(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  return `${parts[0][0] ?? ''}${parts.length > 1 ? parts[parts.length - 1][0] : ''}`.toUpperCase();
}

export function truncate(value, max = 120) {
  const string = String(value ?? '').trim();
  if (string.length <= max) return string;
  return `${string.slice(0, max - 1).trimEnd()}…`;
}

export function isNew(iso, hours = 24) {
  const date = new Date(iso);
  return Number.isFinite(date.getTime()) && Date.now() - date.getTime() < hours * 3600000;
}

export function formatViews(count, lang = 'en') {
  const value = Number(count) || 0;
  if (lang === 'hi') return `${formatNumber(value)} व्यू`;
  return `${formatNumber(value)} ${value === 1 ? 'view' : 'views'}`;
}

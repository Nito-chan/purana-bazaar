import { CONDITIONS, MAX_DESCRIPTION, MAX_LISTING_PRICE, MAX_MESSAGE } from './constants.js';

export function isValidEmail(value) {
  const email = String(value ?? '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
}

export function normalizePhone(value) {
  let digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

export function isValidIndianPhone(value) {
  return /^[6-9]\d{9}$/.test(normalizePhone(value));
}

export function validateLogin(values) {
  const errors = {};
  if (!isValidEmail(values.email)) errors.email = 'validation.email';
  if (!String(values.password ?? '').trim()) errors.password = 'validation.passwordRequired';
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateSignup(values) {
  const errors = {};
  const name = String(values.name ?? '').trim();
  if (name.length < 2) errors.name = 'validation.nameShort';
  if (name.length > 60) errors.name = 'validation.nameLong';
  if (!isValidEmail(values.email)) errors.email = 'validation.email';
  if (!isValidIndianPhone(values.phone)) errors.phone = 'validation.phone';
  if (String(values.password ?? '').length < 8) errors.password = 'validation.passwordShort';
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateListing(values) {
  const errors = {};
  const title = String(values.title ?? '').trim();
  if (title.length < 5) errors.title = 'validation.titleShort';
  else if (title.length > 80) errors.title = 'validation.titleLong';

  const description = String(values.description ?? '').trim();
  if (description.length < 10) errors.description = 'validation.descriptionShort';
  else if (description.length > MAX_DESCRIPTION) errors.description = 'validation.descriptionLong';

  const price = Number(values.price);
  if (!Number.isFinite(price) || price < 0) errors.price = 'validation.price';
  else if (price > MAX_LISTING_PRICE) errors.price = 'validation.priceHigh';

  if (!values.categoryId) errors.categoryId = 'validation.category';
  if (!values.cityId) errors.cityId = 'validation.city';

  if (!CONDITIONS.some((item) => item.value === values.condition)) {
    errors.condition = 'validation.condition';
  }

  const area = String(values.area ?? '').trim();
  if (area.length < 2) errors.area = 'validation.area';
  else if (area.length > 60) errors.area = 'validation.areaLong';

  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateReport(values) {
  const errors = {};
  if (!String(values.reason ?? '').trim()) errors.reason = 'validation.reportReason';
  if (String(values.details ?? '').length > 500) errors.details = 'validation.reportDetailsLong';
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateChatMessage(value) {
  const message = String(value ?? '').trim();
  if (!message) return { ok: false, error: 'validation.messageRequired' };
  if (message.length > MAX_MESSAGE) return { ok: false, error: 'validation.messageLong' };
  return { ok: true, value: message };
}

export function validateForgotPassword(email) {
  return isValidEmail(email) ? { ok: true } : { ok: false, error: 'validation.email' };
}

export function normalizeText(value, max = 500) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

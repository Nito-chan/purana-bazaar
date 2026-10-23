import { t } from '../i18n/index.js';

const DEFAULT_MAX_LENGTH = 120;

/**
 * Mock data must mirror the category schema stored in Supabase. Keeping the
 * fallback here also means the UI still works if an older category row has no
 * schema yet.
 */
export const DEFAULT_ATTRIBUTE_SCHEMAS = Object.freeze({
  mobiles: [
    { key: 'Brand', type: 'text' },
    { key: 'Storage', type: 'text' },
    { key: 'Battery health', type: 'text' },
    { key: 'Box', type: 'boolean' },
  ],
  laptops: [
    { key: 'Brand', type: 'text' },
    { key: 'Processor', type: 'text' },
    { key: 'RAM', type: 'text' },
    { key: 'Storage', type: 'text' },
  ],
  furniture: [
    { key: 'Material', type: 'text' },
    { key: 'Size', type: 'text' },
  ],
  appliances: [
    { key: 'Brand', type: 'text' },
    { key: 'Capacity', type: 'text' },
    { key: 'Type', type: 'text' },
  ],
  bikes: [
    { key: 'Year', type: 'text' },
    { key: 'KM driven', type: 'text' },
    { key: 'Owner', type: 'text' },
    { key: 'Insurance', type: 'text' },
  ],
  cycles: [
    { key: 'Brand', type: 'text' },
    { key: 'Gears', type: 'text' },
    { key: 'Frame', type: 'text' },
  ],
  books: [
    { key: 'Class', type: 'text' },
    { key: 'Subject', type: 'text' },
    { key: 'Language', type: 'text' },
  ],
  'home-kitchen': [
    { key: 'Brand', type: 'text' },
    { key: 'Power', type: 'text' },
    { key: 'Material', type: 'text' },
  ],
  other: [],
});

const ATTRIBUTE_LABEL_FACTORIES = {
  accessories: () => t('attributes.accessories'),
  bag: () => t('attributes.bag'),
  batteryhealth: () => t('attributes.batteryHealth'),
  bill: () => t('attributes.bill'),
  bluetooth: () => t('attributes.bluetooth'),
  box: () => t('attributes.box'),
  brand: () => t('attributes.brand'),
  capacity: () => t('attributes.capacity'),
  class: () => t('attributes.class'),
  color: () => t('attributes.color'),
  condition: () => t('attributes.condition'),
  doors: () => t('attributes.doors'),
  frame: () => t('attributes.frame'),
  gears: () => t('attributes.gears'),
  insurance: () => t('attributes.insurance'),
  jars: () => t('attributes.jars'),
  kmdriven: () => t('attributes.kmDriven'),
  language: () => t('attributes.language'),
  lens: () => t('attributes.lens'),
  locker: () => t('attributes.locker'),
  material: () => t('attributes.material'),
  model: () => t('attributes.model'),
  note: () => t('attributes.note'),
  owner: () => t('attributes.owner'),
  pieces: () => t('attributes.pieces'),
  power: () => t('attributes.power'),
  processor: () => t('attributes.processor'),
  ram: () => t('attributes.ram'),
  screen: () => t('attributes.screen'),
  seats: () => t('attributes.seats'),
  size: () => t('attributes.size'),
  storage: () => t('attributes.storage'),
  subject: () => t('attributes.subject'),
  type: () => t('attributes.type'),
  warranty: () => t('attributes.warranty'),
  weight: () => t('attributes.weight'),
  year: () => t('attributes.year'),
};

function normalizedKey(key) {
  return String(key ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function attributeLabel(key) {
  const factory = ATTRIBUTE_LABEL_FACTORIES[normalizedKey(key)];
  return factory ? factory() : String(key ?? '');
}

export function attributeValueLabel(value) {
  if (value === true || /^(yes|true)$/i.test(String(value ?? '').trim())) {
    return t('common.yes');
  }
  if (value === false || /^(no|false)$/i.test(String(value ?? '').trim())) {
    return t('common.no');
  }
  return String(value ?? '').trim();
}

export function hasAttributeValue(value) {
  if (typeof value === 'boolean') return true;
  return value !== null && value !== undefined && String(value).trim() !== '';
}

export function normalizeAttributeSchema(schema) {
  if (!Array.isArray(schema)) return [];
  const seen = new Set();
  const fields = [];

  for (const raw of schema) {
    if (!raw || typeof raw !== 'object') continue;
    const key = String(raw.key ?? '')
      .trim()
      .slice(0, 40);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const maxLength = Number(raw.maxLength);
    fields.push({
      key,
      type: raw.type === 'boolean' ? 'boolean' : 'text',
      required: Boolean(raw.required),
      maxLength:
        Number.isFinite(maxLength) && maxLength > 0
          ? Math.min(Math.round(maxLength), DEFAULT_MAX_LENGTH)
          : DEFAULT_MAX_LENGTH,
    });
  }

  return fields;
}

export function attributeFieldName(key) {
  const slug = String(key ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `attr-${slug || 'field'}`;
}

export function normalizeAttributeValues(schema, source = {}) {
  const values = {};
  if (!source || typeof source !== 'object' || Array.isArray(source)) return values;

  for (const field of normalizeAttributeSchema(schema)) {
    const raw = source[field.key];
    if (!hasAttributeValue(raw)) continue;

    if (field.type === 'boolean') {
      if (raw === true || /^(yes|true)$/i.test(String(raw).trim())) {
        values[field.key] = 'Yes';
      } else if (raw === false || /^(no|false)$/i.test(String(raw).trim())) {
        values[field.key] = 'No';
      }
      continue;
    }

    values[field.key] = String(raw).replace(/\s+/g, ' ').trim().slice(0, field.maxLength);
  }

  return values;
}

export function validateAttributeValues(schema, source = {}) {
  const errors = {};
  if (!source || typeof source !== 'object' || Array.isArray(source)) return errors;

  for (const field of normalizeAttributeSchema(schema)) {
    const raw = source[field.key];
    const filled = hasAttributeValue(raw);
    if (field.required && !filled) {
      errors[field.key] = {
        key: 'validation.attributeRequired',
        params: { label: attributeLabel(field.key) },
      };
      continue;
    }
    if (field.type === 'text' && filled) {
      const length = String(raw).replace(/\s+/g, ' ').trim().length;
      if (length > field.maxLength) {
        errors[field.key] = {
          key: 'validation.attributeLong',
          params: { label: attributeLabel(field.key), max: field.maxLength },
        };
      }
    }
  }

  return errors;
}

export function displayAttributeEntries(category, attributes) {
  const source =
    attributes && typeof attributes === 'object' && !Array.isArray(attributes) ? attributes : {};
  const schema = normalizeAttributeSchema(category?.attributesSchema);
  const seen = new Set();
  const entries = [];

  for (const field of schema) {
    if (!hasAttributeValue(source[field.key])) continue;
    seen.add(field.key);
    entries.push({
      key: field.key,
      label: attributeLabel(field.key),
      value: attributeValueLabel(source[field.key]),
    });
  }

  for (const [key, value] of Object.entries(source)) {
    if (seen.has(key) || !hasAttributeValue(value)) continue;
    entries.push({
      key,
      label: attributeLabel(key),
      value: attributeValueLabel(value),
    });
  }

  return entries;
}

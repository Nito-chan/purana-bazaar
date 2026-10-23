let enDict = null;
let hiDict = null;

function loadDict(lang) {
  const promise = import(`./${lang}.json`).then((m) => m.default);
  if (lang === 'en') {
    promise.then((d) => {
      enDict = d;
    });
  } else {
    promise.then((d) => {
      hiDict = d;
    });
  }
  return promise;
}

// Start loading both dictionaries immediately. They are fetched in a
// separate chunk so the entry bundle stays small.
loadDict('en');
loadDict('hi');

function resolve(dictionary, key) {
  const parts = String(key ?? '').split('.');
  let value = dictionary;
  for (const part of parts) {
    if (!value || typeof value !== 'object' || !(part in value)) return undefined;
    value = value[part];
  }
  return typeof value === 'string' ? value : undefined;
}

function interpolate(template, params) {
  if (!params || typeof params !== 'object') return template;
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    params[key] === undefined || params[key] === null ? match : String(params[key]),
  );
}

let currentLanguage = 'en';

export function setLanguage(language) {
  currentLanguage = language === 'hi' ? 'hi' : 'en';
  if (typeof document !== 'undefined') {
    document.documentElement.lang = currentLanguage;
  }
  return currentLanguage;
}

export function getLanguage() {
  return currentLanguage;
}

export function t(key, params = {}) {
  if (!key) return '';

  const dictionary = currentLanguage === 'hi' ? hiDict : enDict;
  let value;

  if (params.count !== undefined) {
    const suffix = Number(params.count) === 1 ? 'one' : 'other';
    value = resolve(dictionary, `${key}_${suffix}`) ?? resolve(enDict, `${key}_${suffix}`);
  }

  if (value === undefined) value = resolve(dictionary, key);
  if (value === undefined) value = resolve(enDict, key);
  if (value === undefined) return String(key);

  return interpolate(value, params);
}

export function hasKey(key, language = currentLanguage) {
  return resolve(language === 'hi' ? hiDict : enDict, key) !== undefined;
}

export function errorMessage(error, fallbackKey = 'errors.generic') {
  if (error && typeof error === 'object') {
    if (error.messageKey && hasKey(error.messageKey)) return t(error.messageKey);
    if (error.code) {
      const key = `errors.${error.code}`;
      if (hasKey(key)) return t(key);
    }
    if (typeof error.message === 'string' && error.message.trim()) return error.message;
  }
  return t(fallbackKey);
}

export function conditionLabel(value) {
  return t(`condition.${value}`);
}

export function categoryLabel(category) {
  if (!category) return '';
  return currentLanguage === 'hi' && category.nameHi ? category.nameHi : category.nameEn;
}

export function cityLabel(city) {
  if (!city) return '';
  return currentLanguage === 'hi' && city.nameHi ? city.nameHi : city.name;
}

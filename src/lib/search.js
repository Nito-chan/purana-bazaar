const SYNONYMS = {
  phone: ['mobile', 'mobail', 'smartphone', 'cell', 'फोन', 'मोबाइल', 'सेलफोन'],
  mobile: ['phone', 'mobail', 'smartphone', 'cell', 'फोन', 'मोबाइल', 'सेलफोन'],
  smartphone: ['phone', 'mobile', 'mobail', 'फोन', 'मोबाइल'],
  laptop: ['computer', 'pc', 'notebook', 'लैपटॉप', 'कंप्यूटर'],
  computer: ['laptop', 'pc', 'कंप्यूटर'],
  cycle: ['bicycle', 'साइकिल', 'सायकल'],
  bicycle: ['cycle', 'साइकिल', 'सायकल'],
  bike: ['motorcycle', 'scooter', 'scooty', 'बाइक', 'मोटरसाइकिल', 'स्कूटी'],
  motorcycle: ['bike', 'scooter', 'बाइक', 'मोटरसाइकिल'],
  scooter: ['bike', 'scooty', 'स्कूटी'],
  fridge: ['refrigerator', 'फ्रिज', 'रेफ्रिजरेटर'],
  refrigerator: ['fridge', 'फ्रिज'],
  tv: ['television', 'टीवी', 'टेलीविजन'],
  television: ['tv', 'टीवी'],
  sofa: ['couch', 'सोफा'],
  couch: ['sofa', 'सोफा'],
  bed: ['cot', 'बेड', 'पलंग'],
  cot: ['bed', 'पलंग'],
  ac: ['airconditioner', 'एसी', 'एयरकंडीशनर'],
  washing: ['washer', 'वॉशिंग', 'वाशिंग'],
  washer: ['washing', 'वॉशिंग'],
  book: ['books', 'किताब', 'किताबें', 'पुस्तक'],
  books: ['book', 'किताब', 'किताबें'],
  furniture: ['फर्नीचर'],
  kitchen: ['रसोई'],
  camera: ['कैमरा'],
  watch: ['घड़ी'],
  gold: ['सोना'],
};

export function normalizeQuery(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function simpleVariants(token) {
  const variants = new Set([token]);
  if (token.length > 3 && token.endsWith('s')) variants.add(token.slice(0, -1));
  if (token.length > 3) variants.add(`${token}s`);
  const synonyms = SYNONYMS[token];
  if (synonyms) synonyms.forEach((item) => variants.add(item));
  return Array.from(variants);
}

export function expandQuery(value) {
  return normalizeQuery(value).split(' ').filter(Boolean).map(simpleVariants);
}

export function matchesQuery(haystack, query) {
  const groups = expandQuery(query);
  if (!groups.length) return true;
  const text = normalizeQuery(haystack);
  return groups.every((group) => group.some((token) => text.includes(token)));
}

export const APP_NAME = 'Purana Bazaar';
export const PAGE_SIZE = 20;
export const MAX_PHOTOS = 5;
export const MAX_LISTING_PRICE = 100000000;
export const MAX_DESCRIPTION = 2000;
export const MAX_MESSAGE = 1000;

export const CONDITIONS = [
  { value: 'new', labelKey: 'condition.new' },
  { value: 'like_new', labelKey: 'condition.like_new' },
  { value: 'good', labelKey: 'condition.good' },
  { value: 'fair', labelKey: 'condition.fair' },
  { value: 'for_parts', labelKey: 'condition.for_parts' },
];

export const SORT_OPTIONS = [
  { value: 'newest', labelKey: 'sort.newest' },
  { value: 'price_asc', labelKey: 'sort.priceAsc' },
  { value: 'price_desc', labelKey: 'sort.priceDesc' },
];

export const REPORT_REASONS = [
  { value: 'fake', labelKey: 'report.reason.fake' },
  { value: 'wrong', labelKey: 'report.reason.wrong' },
  { value: 'scam', labelKey: 'report.reason.scam' },
  { value: 'inappropriate', labelKey: 'report.reason.inappropriate' },
  { value: 'prohibited', labelKey: 'report.reason.prohibited' },
  { value: 'other', labelKey: 'report.reason.other' },
];

export const QUICK_REPLIES = [
  'chat.quick.available',
  'chat.quick.lastPrice',
  'chat.quick.today',
];

export const LISTING_STATUS = Object.freeze({
  ACTIVE: 'active',
  SOLD: 'sold',
  EXPIRED: 'expired',
  REMOVED: 'removed',
  PENDING: 'pending_review',
});

const CATEGORY_SLUGS = new Set([
  'mobiles',
  'laptops',
  'furniture',
  'appliances',
  'bikes',
  'cycles',
  'books',
  'home-kitchen',
  'other',
]);

/**
 * Demo listing photos live in `public/demo/listings`. Each seeded listing has
 * one curated photo; the smaller thumb keeps the home grid light while the
 * detail gallery still gets the full-size image.
 */
export function listingPhoto(slug, title) {
  if (!slug) return null;
  const url = `/demo/listings/${slug}.webp`;
  return {
    url,
    thumbUrl: `/demo/listings/thumbs/${slug}.webp`,
    alt: title || 'Listing photo',
  };
}

/**
 * Category photos are the honest fallback when a listing has no uploaded
 * photo (for example a real-mode row whose storage objects are missing).
 */
export function categoryPhoto(slug, title) {
  const file = CATEGORY_SLUGS.has(slug) ? slug : 'other';
  const url = `/demo/categories/${file}.webp`;
  return {
    url,
    thumbUrl: url,
    alt: `${title || 'Listing'} — category photo`,
  };
}

export function fallbackImages(listing) {
  const category = listing.category || { slug: 'other', nameEn: 'Other' };
  return [categoryPhoto(category.slug, listing.title)];
}

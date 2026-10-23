import { h } from '../lib/dom.js';
import { formatPrice, formatRelativeTime, isNew } from '../lib/format.js';
import { getLanguage, t } from '../i18n/index.js';
import { toggleFavourite } from '../lib/favourites.js';
import { listingPath } from '../lib/url.js';
import { icon } from './icons.js';

export function listingCard(listing, options = {}) {
  const { mini = false, showFavourite = true, onFavouriteChange = null } = options;
  const language = getLanguage();
  const image = listing.images?.[0];
  const sold = listing.status === 'sold';

  const favouriteButton =
    showFavourite && !listing.isMine
      ? h(
          'button',
          {
            class: `fav-btn${listing.isFavourite ? ' is-active' : ''}`,
            type: 'button',
            'aria-label': t(listing.isFavourite ? 'listing.unsave' : 'listing.save'),
            'aria-pressed': String(Boolean(listing.isFavourite)),
            onClick: (event) => {
              event.preventDefault();
              event.stopPropagation();
              toggleFavourite(listing, favouriteButton, { onChange: onFavouriteChange });
            },
          },
          icon('heart', { size: 20 }),
        )
      : null;

  const badges = [];
  if (listing.isFeatured) {
    badges.push(h('span', { class: 'badge badge--featured' }, t('listing.featuredBadge')));
  }
  if (sold) {
    badges.push(h('span', { class: 'badge badge--sold' }, t('listing.soldBadge')));
  } else if (isNew(listing.bumpedAt)) {
    badges.push(h('span', { class: 'badge badge--new' }, t('listing.newBadge')));
  }

  return h(
    'article',
    { class: `listing-card${mini ? ' listing-card--mini' : ''}` },
    h(
      'a',
      {
        class: 'listing-card__link',
        href: listingPath(listing),
      },
      h(
        'div',
        { class: 'listing-card__media' },
        image
          ? h('img', {
              src: image.thumbUrl || image.url,
              alt: image.alt || listing.title,
              width: 400,
              height: 400,
              loading: 'lazy',
              decoding: 'async',
            })
          : null,
        badges.length ? h('div', { class: 'listing-card__badges' }, badges) : null,
        sold
          ? h(
              'div',
              { class: 'listing-card__sold' },
              h('span', { class: 'badge badge--sold' }, t('common.sold')),
            )
          : null,
      ),
      h(
        'div',
        { class: 'listing-card__body' },
        h(
          'div',
          { class: 'listing-card__price-row' },
          h('span', { class: 'listing-card__price' }, formatPrice(listing.price)),
          listing.isNegotiable
            ? h('span', { class: 'text-xs text-muted' }, t('listing.negotiable'))
            : null,
        ),
        h('h3', { class: 'listing-card__title' }, listing.title),
        h(
          'p',
          { class: 'listing-card__meta' },
          icon('map-pin', { size: 12 }),
          h('span', {}, listing.area || listing.city?.name || ''),
          h('span', { class: 'listing-card__meta-sep', 'aria-hidden': 'true' }),
          h('span', {}, formatRelativeTime(listing.bumpedAt, language)),
        ),
      ),
    ),
    favouriteButton,
  );
}

export function listingGrid(listings, options = {}) {
  const { className = 'listing-grid', ...cardOptions } = options;
  return h(
    'div',
    { class: className },
    listings.map((listing) => listingCard(listing, cardOptions)),
  );
}

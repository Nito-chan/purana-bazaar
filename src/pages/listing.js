import { api } from '../api/index.js';
import { frag, h } from '../lib/dom.js';
import {
  formatDate,
  formatPrice,
  formatRelativeTime,
  formatViews,
  isNew,
  truncate,
} from '../lib/format.js';
import { absoluteUrl, currentPath, listingPath, parseListingId } from '../lib/url.js';
import { conditionLabel, categoryLabel, cityLabel, t } from '../i18n/index.js';
import { displayAttributeEntries } from '../lib/category-attributes.js';
import { isSignedIn, loginPath, currentUser } from '../lib/auth.js';
import { navigate } from '../lib/navigation.js';
import { setPageTitle, setPageDescription } from '../lib/seo.js';
import { addRecentlyViewed } from '../lib/storage.js';
import { toggleFavourite } from '../lib/favourites.js';
import { avatar, stars } from '../ui/avatar.js';
import { emptyState } from '../ui/empty.js';
import { gallery } from '../ui/gallery.js';
import { icon } from '../ui/icons.js';
import { listingGrid } from '../ui/listing-card.js';
import { openReportSheet } from '../ui/report-sheet.js';
import { reviewForm, reviewNode } from '../ui/reviews.js';
import { openSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';

function withBusy(button, work) {
  if (!button) return work();
  button.disabled = true;
  return work().finally(() => {
    button.disabled = false;
  });
}

function detailAttribute(label, value) {
  return h(
    'div',
    { class: 'attr' },
    h('div', { class: 'attr__label' }, label),
    h('div', { class: 'attr__value' }, value),
  );
}

export async function render({ params }) {
  document.body.dataset.page = 'listing';
  document.body.dataset.actionBar = 'false';
  const id = parseListingId(params.id);

  let listing;
  try {
    listing = await api.listings.get(id);
  } catch {
    setPageTitle(t('listing.notFoundTitle'));
    return h(
      'div',
      { class: 'container page' },
      emptyState({
        iconName: 'package',
        title: t('listing.notFoundTitle'),
        body: t('listing.notFoundBody'),
        actions: [{ label: t('notFound.browse'), href: '/', variant: 'primary' }],
      }),
    );
  }

  api.listings.view(id).catch(() => {});
  addRecentlyViewed(id);

  const language = document.documentElement.lang === 'hi' ? 'hi' : 'en';
  const [similar, sellerInfo, reviews] = await Promise.all([
    api.listings.similar(id, { limit: 4 }).catch(() => []),
    api.sellers.get(listing.sellerId).catch(() => null),
    api.reviews.list({ listingId: id }).catch(() => []),
  ]);

  setPageTitle(listing.title);
  setPageDescription(truncate(listing.description, 155));

  const active = listing.status === 'active';
  const isMine = listing.isMine;

  let reviewsHost = null;
  let reviewFormEl = null;
  let reviewError = '';
  let reviewSubmitting = false;
  const user = currentUser();
  const alreadyReviewed = Boolean(user) && reviews.some((r) => r.reviewerId === user.id);
  const canReview = Boolean(user) && !isMine && !alreadyReviewed;

  let boostProduct = null;
  let boostSubmitting = false;
  let boostError = '';

  async function boostListing(productId) {
    boostSubmitting = true;
    boostError = '';
    try {
      await api.promotions.create({ listingId: id, productId });
      toast.success(t('listing.boosted'));
      // Refresh to reflect isFeatured change.
      window.location.reload();
    } catch (error) {
      boostError = (error && error.messageKey ? t(error.messageKey) : null) || t('errors.generic');
    } finally {
      boostSubmitting = false;
    }
  }

  function openBoostSheet() {
    const sheetContent = h(
      'div',
      { class: 'boost-sheet' },
      h(
        'p',
        { class: 'text-muted' },
        t('listing.boostSubtitle', { title: listing.title }),
      ),
      h(
        'div',
        { class: 'boost-options' },
        h(
          'button',
          {
            class: `boost-option${boostProduct === 'boost-7d' ? ' boost-option--selected' : ''}`,
            type: 'button',
            onClick: () => {
              boostProduct = 'boost-7d';
            },
          },
          h('span', { class: 'boost-option__name' }, '7-day listing boost'),
          h('span', { class: 'boost-option__price' }, '₹49'),
          boostProduct === 'boost-7d' ? h('span', { class: 'boost-option__check' }, icon('check', { size: 16 })) : null,
        ),
        h(
          'button',
          {
            class: `boost-option${boostProduct === 'dealer-30d' ? ' boost-option--selected' : ''}`,
            type: 'button',
            onClick: () => {
              boostProduct = 'dealer-30d';
            },
          },
          h('span', { class: 'boost-option__name' }, '30-day dealer boost'),
          h('span', { class: 'boost-option__price' }, '₹199'),
          boostProduct === 'dealer-30d' ? h('span', { class: 'boost-option__check' }, icon('check', { size: 16 })) : null,
        ),
      ),
      boostError
        ? h(
            'p',
            { class: 'field__error' },
            icon('alert-circle', { size: 16 }),
            h('span', {}, boostError),
          )
        : null,
      h(
        'div',
        { class: 'form__actions' },
        h(
          'button',
          { class: 'btn btn--secondary', type: 'button', onClick: () => handle.close() },
          t('common.cancel'),
        ),
        h(
          'button',
          {
            class: 'btn btn--primary',
            type: 'button',
            disabled: !boostProduct || boostSubmitting,
            onClick: () => {
              handle.close();
              boostListing(boostProduct);
            },
          },
          boostSubmitting ? t('common.saving') : t('listing.boost'),
        ),
      ),
    );

    const handle = openSheet({
      title: t('listing.boostTitle'),
      content: sheetContent,
    });
  }

  async function submitReview(values) {
    reviewSubmitting = true;
    reviewError = '';
    try {
      const created = await api.reviews.create({
        listingId: id,
        sellerId: listing.sellerId,
        rating: values.rating,
        body: values.body,
      });
      reviews.unshift(created);
      if (reviewsHost) {
        reviewsHost.prepend(reviewNode(created, language));
      }
      reviewError = '';
      reviewFormEl?.remove();
      reviewFormEl = null;
      toast.success(t('reviews.thanks'));
    } catch (error) {
      reviewError =
        (error && error.messageKey ? t(error.messageKey) : null) || t('errors.reviewFailed');
    } finally {
      reviewSubmitting = false;
    }
  }

  const favouriteButton = listing.isMine
    ? null
    : h(
        'button',
        {
          class: `fav-btn${listing.isFavourite ? ' is-active' : ''}`,
          type: 'button',
          'aria-label': t(listing.isFavourite ? 'listing.unsave' : 'listing.save'),
          'aria-pressed': String(listing.isFavourite),
          onClick: () => toggleFavourite(listing, favouriteButton),
        },
        icon('heart', { size: 22 }),
      );

  async function shareListing() {
    const url = absoluteUrl(listingPath(listing));
    if (navigator.share) {
      try {
        await navigator.share({ title: listing.title, text: listing.title, url });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('listing.shareCopied'));
    } catch {
      toast.error(t('listing.shareError'));
    }
  }

  async function revealContact(button, channel) {
    if (!isSignedIn()) {
      navigate(loginPath(currentPath()));
      return;
    }
    await withBusy(button, async () => {
      try {
        const contact = await api.listings.contact(listing.id);
        const phone = String(contact.phone || '')
          .replace(/\D/g, '')
          .slice(-10);
        if (channel === 'whatsapp') {
          const url = `https://wa.me/91${phone}?text=${encodeURIComponent(
            `${t('listing.chat')}: ${listing.title} — ${absoluteUrl(listingPath(listing))}`,
          )}`;
          const opened = window.open(url, '_blank', 'noopener,noreferrer');
          if (!opened) window.location.href = url;
        } else {
          window.location.href = `tel:+91${phone}`;
        }
      } catch {
        toast.error(t('listing.contactError'));
      }
    });
  }

  async function startChat(button) {
    if (!isSignedIn()) {
      navigate(loginPath(currentPath()));
      return;
    }
    await withBusy(button, async () => {
      try {
        const conversation = await api.chats.start(listing.id);
        navigate(`/chat/${conversation.id}`);
      } catch {
        toast.error(t('errors.chatFailed'));
      }
    });
  }

  const actionButton = (label, iconName, className, onClick) =>
    h(
      'button',
      {
        class: `btn ${className}`,
        type: 'button',
        onClick: (event) => onClick(event.currentTarget),
      },
      icon(iconName, { size: 19 }),
      label,
    );

  const contactActions = () => [
    actionButton(t('listing.call'), 'phone', 'btn--secondary', (button) =>
      revealContact(button, 'call'),
    ),
    actionButton(t('listing.whatsapp'), 'whatsapp', 'btn--whatsapp', (button) =>
      revealContact(button, 'whatsapp'),
    ),
    actionButton(t('listing.chat'), 'message-circle', 'btn--primary', startChat),
  ];

  const desktopActions = active
    ? isMine
      ? h(
          'div',
          { class: 'detail-actions-desktop' },
          h(
            'a',
            { class: 'btn btn--primary btn--block', href: `/sell/${listing.id}` },
            icon('pencil', { size: 18 }),
            t('myListings.edit'),
          ),
          !listing.isFeatured
            ? h(
                'button',
                {
                  class: 'btn btn--accent btn--block',
                  type: 'button',
                  disabled: boostSubmitting,
                  onClick: () => openBoostSheet(),
                },
                icon('zap', { size: 18 }),
                t('listing.boost'),
              )
            : null,
        )
      : h(
          'div',
          { class: 'detail-actions-desktop' },
          h('div', { class: 'cluster' }, contactActions()),
        )
    : h('div', { class: 'detail-sold' }, t('listing.soldBody'));

  const mobileActionBar =
    active && !isMine
      ? h(
          'div',
          { class: 'action-bar', role: 'group', 'aria-label': t('listing.contactSeller') },
          h('p', { class: 'action-bar__note' }, t('listing.safetyBody')),
          contactActions(),
        )
      : active && isMine
        ? h(
            'div',
            { class: 'action-bar', role: 'group' },
            h(
              'a',
              {
                class: 'btn btn--primary',
                href: `/sell/${listing.id}`,
                style: { gridColumn: '1 / -1' },
              },
              icon('pencil', { size: 18 }),
              t('myListings.edit'),
            ),
            !listing.isFeatured
              ? h(
                  'button',
                  {
                    class: 'btn btn--accent',
                    type: 'button',
                    disabled: boostSubmitting,
                    onClick: () => openBoostSheet(),
                  },
                  icon('zap', { size: 18 }),
                  t('listing.boost'),
                )
              : null,
          )
        : null;

  const images = listing.images || [];
  document.body.dataset.actionBar = mobileActionBar ? 'true' : 'false';
  const condition = conditionLabel(listing.condition);
  const badges = [];
  if (listing.isFeatured) {
    badges.push(h('span', { class: 'badge badge--featured' }, t('listing.featuredBadge')));
  }
  if (isNew(listing.bumpedAt)) {
    badges.push(h('span', { class: 'badge badge--new' }, t('listing.newBadge')));
  }
  if (listing.status === 'sold') {
    badges.push(h('span', { class: 'badge badge--sold' }, t('listing.soldBadge')));
  } else if (listing.status === 'expired') {
    badges.push(h('span', { class: 'badge badge--warning' }, t('common.expired')));
  }
  badges.push(h('span', { class: 'badge badge--neutral' }, condition));

  const attributes = [
    detailAttribute(t('listing.condition'), condition),
    detailAttribute(t('listing.category'), categoryLabel(listing.category)),
    detailAttribute(t('listing.city'), cityLabel(listing.city)),
    listing.area ? detailAttribute(t('listing.area'), listing.area) : null,
    ...displayAttributeEntries(listing.category, listing.attributes).map((entry) =>
      detailAttribute(entry.label, entry.value),
    ),
  ].filter(Boolean);

  const seller = listing.seller;
  const sellerActive = sellerInfo?.activeCount ?? 0;
  const sellerCard = seller
    ? h(
        'section',
        { class: 'seller-card', 'aria-label': t('listing.seller') },
        h(
          'div',
          { class: 'seller-card__head' },
          avatar({ name: seller.name, size: 'lg', verified: seller.isVerified }),
          h(
            'div',
            { class: 'seller-card__body' },
            h(
              'p',
              { class: 'seller-card__name' },
              seller.name,
              seller.isVerified ? h('span', { class: 'sr-only' }, t('profile.verified')) : null,
            ),
            seller.ratingCount
              ? h('div', {}, stars({ rating: seller.rating, count: seller.ratingCount }))
              : null,
            h(
              'p',
              { class: 'seller-card__meta' },
              t('listing.memberSince', { date: formatDate(seller.memberSince, language) }),
            ),
          ),
        ),
        h(
          'div',
          { class: 'seller-card__stats' },
          h(
            'div',
            {},
            h('div', { class: 'seller-stat__value' }, String(sellerActive)),
            h('div', { class: 'seller-stat__label' }, t('profile.statsListings')),
          ),
          h(
            'div',
            {},
            h('div', { class: 'seller-stat__value' }, String(seller.ratingCount || 0)),
            h(
              'div',
              { class: 'seller-stat__label' },
              t('listing.rating', { rating: seller.rating.toFixed(1) }),
            ),
          ),
        ),
        h(
          'a',
          { class: 'btn btn--secondary btn--sm', href: `/u/${seller.id}` },
          t('listing.seeProfile'),
          icon('arrow-right', { size: 16 }),
        ),
      )
    : null;

  const similarSection = similar.length
    ? h(
        'section',
        { class: 'section' },
        h(
          'div',
          { class: 'section__head' },
          h('h2', { class: 'section__title' }, t('listing.similar')),
          h('a', { class: 'section__link', href: '/' }, t('common.seeAll')),
        ),
        listingGrid(similar, { className: 'listing-grid' }),
      )
    : null;

  return frag(
    h(
      'div',
      { class: 'container page' },
      h(
        'div',
        { class: 'listing-detail' },
        h(
          'div',
          { class: 'detail-topbar' },
          h(
            'a',
            { class: 'back-link', href: '/' },
            icon('chevron-left', { size: 18 }),
            t('listing.back'),
          ),
          h('span', { class: 'detail-topbar__spacer' }),
          h(
            'button',
            {
              class: 'icon-btn',
              type: 'button',
              'aria-label': t('listing.share'),
              onClick: shareListing,
            },
            icon('share-2', { size: 20 }),
          ),
          isMine
            ? null
            : h(
                'button',
                {
                  class: 'icon-btn',
                  type: 'button',
                  'aria-label': t('listing.reportTitle'),
                  onClick: () =>
                    openReportSheet({ listingId: listing.id, userId: listing.sellerId }),
                },
                icon('flag', { size: 20 }),
              ),
        ),
        h('div', { class: 'detail-media' }, gallery(images), favouriteButton),
        h(
          'div',
          { class: 'detail-info' },
          h('div', { class: 'detail-badges' }, badges),
          h(
            'div',
            { class: 'detail-price-row' },
            h('span', { class: 'price-ticket' }, formatPrice(listing.price)),
            listing.isNegotiable
              ? h('span', { class: 'badge badge--success' }, t('listing.negotiable'))
              : null,
            listing.status !== 'active'
              ? h(
                  'span',
                  { class: 'badge badge--neutral' },
                  t(listing.status === 'sold' ? 'common.sold' : 'common.expired'),
                )
              : null,
          ),
          h('h1', { class: 'detail-title' }, listing.title),
          h(
            'div',
            { class: 'detail-meta' },
            icon('map-pin', { size: 15 }),
            h('span', {}, listing.area),
            h('span', { class: 'meta-row__sep', 'aria-hidden': 'true' }),
            icon('clock', { size: 15 }),
            h(
              'span',
              {},
              t('listing.posted', { time: formatRelativeTime(listing.bumpedAt, language) }),
            ),
            h('span', { class: 'meta-row__sep', 'aria-hidden': 'true' }),
            icon('eye', { size: 15 }),
            h('span', {}, formatViews(listing.viewsCount, language)),
          ),
          h(
            'section',
            {},
            h('h2', { class: 'detail-section-title' }, t('listing.description')),
            h('p', { class: 'detail-description' }, listing.description),
          ),
          attributes.length
            ? h(
                'section',
                {},
                h('h2', { class: 'detail-section-title' }, t('listing.details')),
                h('div', { class: 'attr-grid' }, attributes),
              )
            : null,
          sellerCard,
          canReview || reviews.length
            ? h(
                'section',
                { class: 'detail-section', style: { marginTop: '20px' } },
                h('h2', { class: 'detail-section-title' }, t('reviews.title')),
                (() => {
                  const host = h('div', { class: 'review-list' });
                  if (reviews.length) {
                    host.replaceChildren(...reviews.map((r) => reviewNode(r, language)));
                  }
                  reviewsHost = host;
                  return host;
                })(),
                canReview
                  ? (reviewFormEl = reviewForm({
                      listingId: id,
                      sellerId: listing.sellerId,
                      onSubmit: submitReview,
                      rating: 0,
                      body: '',
                      error: reviewError,
                      submitting: reviewSubmitting,
                    }))
                  : null,
              )
            : null,
          h(
            'div',
            { class: 'detail-safety' },
            icon('shield-check', { size: 20 }),
            h(
              'div',
              {},
              h('div', { class: 'strong' }, t('listing.safetyTitle')),
              h('div', { class: 'text-muted' }, t('listing.safetyBody')),
            ),
          ),
          desktopActions,
        ),
      ),
      similarSection,
    ),
    mobileActionBar,
  );
}

import { api } from '../api/index.js';
import { h } from '../lib/dom.js';
import { formatDate } from '../lib/format.js';
import { t } from '../i18n/index.js';
import { isSignedIn, loginPath } from '../lib/auth.js';
import { currentPath } from '../lib/url.js';
import { navigate, refresh } from '../lib/navigation.js';
import { setPageTitle } from '../lib/seo.js';
import { store } from '../store.js';
import { avatar, stars } from '../ui/avatar.js';
import { emptyState } from '../ui/empty.js';
import { confirmSheet } from '../ui/confirm-sheet.js';
import { icon } from '../ui/icons.js';
import { listingGrid } from '../ui/listing-card.js';
import { openReportSheet } from '../ui/report-sheet.js';
import { toast } from '../ui/toast.js';

export async function render({ params }) {
  document.body.dataset.page = 'seller';

  let data;
  let listings;
  try {
    data = await api.sellers.get(params.id);
    listings = await api.sellers.listings(params.id);
  } catch {
    setPageTitle(t('seller.notFoundTitle'));
    return h(
      'div',
      { class: 'container page' },
      emptyState({
        iconName: 'user',
        title: t('seller.notFoundTitle'),
        body: t('seller.notFoundBody'),
        actions: [{ label: t('notFound.browse'), href: '/', variant: 'primary' }],
      }),
    );
  }

  const seller = data.seller;
  const isMine = store.getState().auth.user?.id === seller.id;
  const language = store.getState().language;
  setPageTitle(seller.name);

  async function toggleBlock() {
    if (!isSignedIn()) {
      navigate(loginPath(currentPath()));
      return;
    }
    if (!data.isBlocked) {
      const confirmed = await confirmSheet({
        title: t('seller.block'),
        body: t('seller.blockBody'),
        confirmLabel: t('seller.block'),
        danger: true,
      });
      if (!confirmed) return;
    }
    try {
      const result = await api.blocks.toggle(seller.id);
      toast.success(t(result.blocked ? 'seller.blocked' : 'seller.unblocked'));
      refresh();
    } catch {
      toast.error(t('common.genericError'));
    }
  }

  const actions = isMine
    ? h(
        'div',
        { class: 'seller-hero__actions' },
        h(
          'a',
          { class: 'btn btn--secondary btn--sm', href: '/my-listings' },
          icon('list', { size: 16 }),
          t('myListings.title'),
        ),
      )
    : h(
        'div',
        { class: 'seller-hero__actions' },
        h(
          'button',
          {
            class: 'btn btn--secondary btn--sm',
            type: 'button',
            onClick: () => {
              if (!isSignedIn()) {
                navigate(loginPath(currentPath()));
                return;
              }
              openReportSheet({ userId: seller.id });
            },
          },
          icon('flag', { size: 16 }),
          t('seller.report'),
        ),
        h(
          'button',
          {
            class: `btn btn--sm ${data.isBlocked ? 'btn--primary' : 'btn--secondary'}`,
            type: 'button',
            onClick: toggleBlock,
          },
          icon(data.isBlocked ? 'check-circle' : 'ban', { size: 16 }),
          t(data.isBlocked ? 'common.unblock' : 'seller.block'),
        ),
      );

  const blockedNotice = data.isBlocked
    ? h(
        'div',
        { class: 'alert alert--warning', role: 'status', style: { marginTop: '16px' } },
        icon('ban', { size: 18 }),
        h(
          'div',
          {},
          h('p', { class: 'strong' }, t('chat.blocked')),
          h('p', { class: 'text-sm' }, t('chat.unblockHint')),
        ),
        h(
          'button',
          { class: 'btn btn--secondary btn--sm', type: 'button', onClick: toggleBlock },
          t('common.unblock'),
        ),
      )
    : null;

  return h(
    'div',
    { class: 'container page' },
    h(
      'a',
      { class: 'back-link', href: '/', style: { marginBottom: '8px' } },
      icon('chevron-left', { size: 18 }),
      t('listing.back'),
    ),
    h(
      'div',
      { class: 'seller-hero' },
      h(
        'div',
        { class: 'seller-hero__head' },
        avatar({ name: seller.name, size: 'xl', verified: seller.isVerified }),
        h(
          'div',
          { class: 'seller-hero__body' },
          h('h1', { class: 'seller-hero__name' }, seller.name),
          seller.ratingCount
            ? h(
                'div',
                { style: { marginTop: '3px' } },
                stars({ rating: seller.rating, count: seller.ratingCount }),
              )
            : null,
          h(
            'p',
            { class: 'seller-hero__meta' },
            t('seller.memberSince', { date: formatDate(seller.memberSince, language) }),
          ),
          h(
            'p',
            { class: 'seller-hero__meta' },
            t('seller.activeListings', { count: data.activeCount }),
            data.soldCount ? ` · ${t('common.sold')}: ${data.soldCount}` : '',
          ),
        ),
      ),
      seller.bio ? h('p', { class: 'text-muted' }, seller.bio) : null,
      actions,
    ),
    blockedNotice,
    h(
      'div',
      { class: 'section__head', style: { marginTop: '28px' } },
      h('h2', { class: 'section__title' }, t('seller.listingsTitle', { name: seller.name })),
    ),
    listings.length
      ? h(
          'div',
          { style: { marginTop: '16px' } },
          listingGrid(listings, { className: 'listing-grid' }),
        )
      : emptyState({
          iconName: 'tag',
          title: t('seller.noListings'),
          body: data.isBlocked ? t('chat.unblockHint') : t('home.emptyBody'),
          actions: isMine
            ? [{ label: t('nav.sell'), href: '/sell', variant: 'primary' }]
            : [{ label: t('notFound.browse'), href: '/', variant: 'primary' }],
        }),
  );
}

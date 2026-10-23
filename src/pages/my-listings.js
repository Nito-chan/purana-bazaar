import { api } from '../api/index.js';
import { h } from '../lib/dom.js';
import { formatNumber, formatPrice, formatRelativeTime, formatViews } from '../lib/format.js';
import { addQuery, currentPath, listingPath } from '../lib/url.js';
import { replaceUrl } from '../lib/navigation.js';
import { isSignedIn } from '../lib/auth.js';
import { setPageTitle } from '../lib/seo.js';
import { t } from '../i18n/index.js';
import { store } from '../store.js';
import { authRequiredState, errorState } from '../ui/auth-gate.js';
import { confirmSheet } from '../ui/confirm-sheet.js';
import { emptyState } from '../ui/empty.js';
import { icon } from '../ui/icons.js';
import { toast } from '../ui/toast.js';

const TABS = ['active', 'sold', 'expired'];

function statusBadge(status) {
  if (status === 'sold') return h('span', { class: 'badge badge--sold' }, t('common.sold'));
  if (status === 'expired')
    return h('span', { class: 'badge badge--warning' }, t('common.expired'));
  return h('span', { class: 'badge badge--success' }, t('common.active'));
}

export async function render({ query }) {
  document.body.dataset.page = 'myListings';
  setPageTitle(t('myListings.title'));

  if (!isSignedIn()) {
    return h(
      'div',
      { class: 'container page' },
      h('h1', { class: 'page-title' }, t('myListings.title')),
      h('div', { style: { marginTop: '16px' } }, authRequiredState({ next: currentPath() })),
    );
  }

  let listings = [];
  try {
    listings = await api.listings.my();
  } catch {
    return h(
      'div',
      { class: 'container page' },
      errorState({ onRetry: () => window.location.reload() }),
    );
  }

  const language = store.getState().language;
  let tab = TABS.includes(query.status) ? query.status : 'active';

  const tabsHost = h('div', {
    class: 'tabs',
    role: 'tablist',
    'aria-label': t('myListings.title'),
  });
  const listHost = h('div', {
    class: 'listing-rows',
    id: 'my-listings-panel',
    role: 'tabpanel',
    'aria-labelledby': 'my-listings-tab-active',
  });
  const resultsCount = h('p', { class: 'result-count' });
  const performanceHost = h('section', {
    class: 'performance-summary',
    'aria-labelledby': 'performance-title',
  });

  function counts() {
    return {
      active: listings.filter((listing) => listing.status === 'active').length,
      sold: listings.filter((listing) => listing.status === 'sold').length,
      expired: listings.filter((listing) => listing.status === 'expired').length,
    };
  }

  function performanceTotals() {
    return listings.reduce(
      (totals, listing) => {
        totals.views += Number(listing.viewsCount) || 0;
        totals.contacts += Number(listing.contactsCount) || 0;
        if (listing.status === 'active') totals.active += 1;
        if (listing.status === 'sold') totals.sold += 1;
        return totals;
      },
      { active: 0, sold: 0, views: 0, contacts: 0 },
    );
  }

  function performanceCard({ label, value, iconName, tone }) {
    return h(
      'article',
      { class: `performance-card performance-card--${tone}` },
      h('span', { class: 'performance-card__icon' }, icon(iconName, { size: 19 })),
      h(
        'div',
        { class: 'performance-card__body' },
        h('p', { class: 'performance-card__value' }, formatNumber(value)),
        h('p', { class: 'performance-card__label' }, label),
      ),
    );
  }

  function renderPerformance() {
    const totals = performanceTotals();
    performanceHost.replaceChildren(
      h(
        'div',
        { class: 'performance-summary__head' },
        h(
          'h2',
          { class: 'performance-summary__title', id: 'performance-title' },
          t('myListings.performance'),
        ),
        h('p', { class: 'performance-summary__hint' }, t('myListings.performanceHint')),
      ),
      h(
        'div',
        { class: 'performance-grid' },
        performanceCard({
          label: t('myListings.active'),
          value: totals.active,
          iconName: 'tag',
          tone: 'active',
        }),
        performanceCard({
          label: t('myListings.totalViews'),
          value: totals.views,
          iconName: 'eye',
          tone: 'views',
        }),
        performanceCard({
          label: t('myListings.totalContacts'),
          value: totals.contacts,
          iconName: 'phone',
          tone: 'contacts',
        }),
        performanceCard({
          label: t('myListings.sold'),
          value: totals.sold,
          iconName: 'check-circle',
          tone: 'sold',
        }),
      ),
    );
  }

  function renderTabs() {
    const totals = counts();
    tabsHost.replaceChildren(
      ...TABS.map((value) =>
        h(
          'button',
          {
            class: 'tab',
            type: 'button',
            role: 'tab',
            id: `my-listings-tab-${value}`,
            'aria-selected': String(tab === value),
            'aria-controls': 'my-listings-panel',
            tabIndex: tab === value ? 0 : -1,
            onClick: () => {
              tab = value;
              const basePath = window.location.pathname.replace(/\/+$/, '') || '/';
              replaceUrl(addQuery(basePath, { status: value === 'active' ? null : value }));
              renderTabs();
              renderList();
            },
            onKeydown: (event) => {
              if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
              event.preventDefault();
              const index = TABS.indexOf(tab);
              const nextIndex =
                event.key === 'ArrowRight'
                  ? (index + 1) % TABS.length
                  : (index - 1 + TABS.length) % TABS.length;
              tab = TABS[nextIndex];
              const basePath = window.location.pathname.replace(/\/+$/, '') || '/';
              replaceUrl(addQuery(basePath, { status: tab === 'active' ? null : tab }));
              renderTabs();
              renderList();
              document.getElementById(`my-listings-tab-${tab}`)?.focus();
            },
          },
          `${t(`myListings.${value}`)} `,
          h('span', { class: 'text-muted text-xs' }, String(totals[value])),
        ),
      ),
    );
    listHost.setAttribute('aria-labelledby', `my-listings-tab-${tab}`);
  }

  async function reload() {
    try {
      listings = await api.listings.my();
      renderPerformance();
      renderTabs();
      renderList();
    } catch {
      toast.error(t('common.genericError'));
    }
  }

  async function markSold(listing) {
    const confirmed = await confirmSheet({
      title: t('myListings.confirmSoldTitle'),
      body: t('myListings.confirmSoldBody'),
      confirmLabel: t('myListings.markSold'),
    });
    if (!confirmed) return;
    try {
      await api.listings.markSold(listing.id);
      toast.success(t('myListings.markedSold'));
      await reload();
    } catch {
      toast.error(t('common.genericError'));
    }
  }

  async function removeListing(listing) {
    const confirmed = await confirmSheet({
      title: t('myListings.confirmDeleteTitle'),
      body: t('myListings.confirmDeleteBody'),
      confirmLabel: t('myListings.delete'),
      danger: true,
    });
    if (!confirmed) return;
    try {
      await api.listings.remove(listing.id);
      toast.success(t('myListings.deleted'));
      await reload();
    } catch {
      toast.error(t('common.genericError'));
    }
  }

  async function renewListing(listing) {
    try {
      await api.listings.renew(listing.id);
      toast.success(t('myListings.renewed'));
      tab = 'active';
      const basePath = window.location.pathname.replace(/\/+$/, '') || '/';
      replaceUrl(basePath);
      await reload();
    } catch {
      toast.error(t('common.genericError'));
    }
  }

  function action(label, iconName, onClick, danger = false) {
    return h(
      'button',
      {
        class: `listing-row__action${danger ? ' listing-row__action--danger' : ''}`,
        type: 'button',
        onClick,
      },
      icon(iconName, { size: 14 }),
      label,
    );
  }

  function renderList() {
    const filtered = listings.filter((listing) => listing.status === tab);
    resultsCount.textContent = t('common.item', { count: filtered.length });

    if (!filtered.length) {
      listHost.replaceChildren(
        emptyState({
          iconName: 'tag',
          title: t('myListings.emptyTitle'),
          body: t('myListings.emptyBody'),
          actions: [{ label: t('myListings.emptyAction'), href: '/sell', variant: 'primary' }],
        }),
      );
      return;
    }

    listHost.replaceChildren(
      ...filtered.map((listing) => {
        const image = listing.images?.[0];
        return h(
          'article',
          { class: 'listing-row' },
          h(
            'a',
            {
              class: 'listing-row__media',
              href: listingPath(listing),
              'aria-label': listing.title,
            },
            image
              ? h('img', {
                  src: image.thumbUrl || image.url,
                  alt: image.alt || listing.title,
                  width: 208,
                  height: 208,
                  loading: 'lazy',
                })
              : null,
          ),
          h(
            'div',
            { class: 'listing-row__body' },
            h(
              'div',
              { class: 'listing-row__top' },
              h('a', { class: 'listing-row__title', href: listingPath(listing) }, listing.title),
              h('span', { class: 'listing-row__price' }, formatPrice(listing.price)),
            ),
            h(
              'div',
              { class: 'listing-row__meta' },
              statusBadge(listing.status),
              h('span', {}, formatViews(listing.viewsCount, language)),
              h(
                'span',
                { class: 'listing-row__metric' },
                icon('phone', { size: 12 }),
                t('myListings.contacts', { count: Number(listing.contactsCount) || 0 }),
              ),
              h('span', {}, formatRelativeTime(listing.bumpedAt, language)),
            ),
            h(
              'div',
              { class: 'listing-row__actions' },
              tab === 'active'
                ? h(
                    'a',
                    { class: 'listing-row__action', href: `/sell/${listing.id}` },
                    icon('pencil', { size: 14 }),
                    t('myListings.edit'),
                  )
                : null,
              tab === 'active'
                ? action(t('myListings.markSold'), 'check', () => markSold(listing))
                : null,
              tab === 'expired'
                ? action(t('myListings.renew'), 'refresh-cw', () => renewListing(listing))
                : null,
              action(t('myListings.delete'), 'trash-2', () => removeListing(listing), true),
            ),
          ),
        );
      }),
    );
  }

  renderPerformance();
  renderTabs();
  renderList();

  return h(
    'div',
    { class: 'container page' },
    h(
      'div',
      { class: 'my-listings-head' },
      h(
        'div',
        {},
        h('h1', { class: 'page-title' }, t('myListings.title')),
        h('p', { class: 'text-muted' }, t('myListings.subtitle')),
      ),
      h(
        'a',
        { class: 'btn btn--primary', href: '/sell' },
        icon('plus', { size: 18 }),
        t('nav.sell'),
      ),
    ),
    performanceHost,
    h('div', { style: { marginTop: '20px' } }, tabsHost),
    h('div', { class: 'results-head', style: { marginTop: '12px' } }, resultsCount),
    listHost,
  );
}

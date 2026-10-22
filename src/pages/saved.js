import { api } from '../api/index.js';
import { h } from '../lib/dom.js';
import { t } from '../i18n/index.js';
import { isSignedIn } from '../lib/auth.js';
import { currentPath } from '../lib/url.js';
import { setPageTitle } from '../lib/seo.js';
import { authRequiredState, errorState } from '../ui/auth-gate.js';
import { emptyState } from '../ui/empty.js';
import { listingCard } from '../ui/listing-card.js';

export async function render() {
  document.body.dataset.page = 'saved';
  setPageTitle(t('saved.title'));

  if (!isSignedIn()) {
    return h(
      'div',
      { class: 'container page' },
      h('h1', { class: 'page-title' }, t('saved.title')),
      h('div', { style: { marginTop: '16px' } }, authRequiredState({ next: currentPath() })),
    );
  }

  let items = [];
  try {
    items = await api.favourites.list();
  } catch {
    return h(
      'div',
      { class: 'container page' },
      errorState({ onRetry: () => window.location.reload() }),
    );
  }

  const resultsCount = h('p', { class: 'result-count' });
  const grid = h('div', { class: 'listing-grid' });

  function renderGrid() {
    resultsCount.textContent = t('common.item', { count: items.length });
    if (!items.length) {
      grid.className = '';
      grid.replaceChildren(
        emptyState({
          iconName: 'heart',
          title: t('saved.emptyTitle'),
          body: t('saved.emptyBody'),
          actions: [{ label: t('saved.browse'), href: '/', variant: 'primary' }],
        }),
      );
      return;
    }

    grid.className = 'listing-grid';
    grid.replaceChildren(
      ...items.map((listing) =>
        listingCard(listing, {
          onFavouriteChange: (saved) => {
            if (saved) return;
            items = items.filter((item) => item.id !== listing.id);
            renderGrid();
          },
        }),
      ),
    );
  }

  renderGrid();

  return h(
    'div',
    { class: 'container page' },
    h(
      'div',
      { class: 'page-head' },
      h(
        'div',
        {},
        h('h1', { class: 'page-title' }, t('saved.title')),
        h('p', { class: 'text-muted' }, t('saved.subtitle')),
      ),
      resultsCount,
    ),
    h('div', { style: { marginTop: '20px' } }, grid),
  );
}

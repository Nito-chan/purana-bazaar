import { api } from '../api/index.js';
import { h } from '../lib/dom.js';
import { addQuery } from '../lib/url.js';
import { t, categoryLabel, cityLabel } from '../i18n/index.js';
import { categoryBySlug, cityBySlug, setCityPreference, store } from '../store.js';
import { setPageTitle } from '../lib/seo.js';
import { emptyState } from '../ui/empty.js';
import { errorState } from '../ui/auth-gate.js';
import { icon } from '../ui/icons.js';
import { listingGrid } from '../ui/listing-card.js';

export async function render({ params }) {
  document.body.dataset.page = 'landing';
  const state = store.getState();
  const city = cityBySlug(state.cities, params.city);
  const category = categoryBySlug(state.categories, params.category);

  if (!city || !category) {
    setPageTitle(t('notFound.title'));
    return h(
      'div',
      { class: 'container page' },
      emptyState({
        iconName: 'map-pin',
        title: t('notFound.title'),
        body: t('notFound.body'),
        actions: [{ label: t('notFound.home'), href: '/', variant: 'primary' }],
      }),
    );
  }

  setCityPreference(city.id);

  const title = t('home.categoryTitle', {
    category: categoryLabel(category),
    city: cityLabel(city),
  });
  setPageTitle(title);

  let listings = [];
  let failed = false;
  try {
    const result = await api.listings.feed({
      cityId: city.id,
      categoryId: category.id,
      limit: 24,
    });
    listings = result.items;
  } catch {
    failed = true;
  }

  return h(
    'div',
    { class: 'container page' },
    h(
      'div',
      { class: 'city-landing' },
      h(
        'div',
        { class: 'city-landing__head' },
        h(
          'p',
          { class: 'home-head__eyebrow' },
          icon('map-pin', { size: 14 }),
          city.isLaunch ? t('home.launchCity') : t('home.comingSoon'),
        ),
        h('h1', { class: 'city-landing__title' }, title),
        h('p', { class: 'city-landing__body' }, t('home.subtitle')),
      ),
      h(
        'div',
        { class: 'chip-row', 'aria-label': t('filter.category') },
        h(
          'a',
          {
            class: 'chip',
            href: '/',
            'aria-label': t('home.allCategories'),
          },
          t('home.allCategories'),
        ),
        state.categories.map((item) =>
          h(
            'a',
            {
              class: `chip${item.id === category.id ? ' is-active' : ''}`,
              href: `/${city.slug}/${item.slug}`,
              'aria-current': item.id === category.id ? 'page' : null,
            },
            categoryLabel(item),
          ),
        ),
      ),
      failed
        ? errorState({
            body: t('errors.loadFailed'),
            onRetry: () => window.location.reload(),
          })
        : listings.length
          ? h(
              'div',
              {},
              h(
                'div',
                { class: 'section__head', style: { marginBottom: '14px' } },
                h('h2', { class: 'section__title' }, t('home.results', { count: listings.length })),
                h(
                  'a',
                  { class: 'section__link', href: addQuery('/', { category: category.slug }) },
                  t('common.seeAll'),
                ),
              ),
              listingGrid(listings, { className: 'listing-grid' }),
            )
          : emptyState({
              iconName: 'tag',
              title: t('home.emptyTitle'),
              body: t('home.emptyBody'),
              actions: [
                { label: t('home.emptyAction'), href: '/sell?city=' + city.id, variant: 'primary' },
                { label: t('notFound.browse'), href: '/', variant: 'secondary' },
              ],
            }),
      h(
        'div',
        { class: 'cluster', style: { marginTop: '8px' } },
        h(
          'a',
          { class: 'btn btn--primary', href: '/sell' },
          icon('plus', { size: 18 }),
          t('nav.sell'),
        ),
        h(
          'a',
          { class: 'btn btn--secondary', href: '/' },
          icon('home', { size: 18 }),
          t('nav.home'),
        ),
      ),
    ),
  );
}

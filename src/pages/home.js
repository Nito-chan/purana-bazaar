import { api } from '../api/index.js';
import { h } from '../lib/dom.js';
import { addQuery, currentPath } from '../lib/url.js';
import { replaceUrl } from '../lib/navigation.js';
import { onCleanup } from '../lib/lifecycle.js';
import { CONDITIONS, SORT_OPTIONS } from '../lib/constants.js';
import { formatPrice } from '../lib/format.js';
import { categoryLabel, cityLabel, conditionLabel, t } from '../i18n/index.js';
import { categoryBySlug, cityById, setCityPreference, store } from '../store.js';
import { setPageTitle } from '../lib/seo.js';
import { openSheet } from '../ui/sheet.js';
import { icon } from '../ui/icons.js';
import { emptyState } from '../ui/empty.js';
import { errorState } from '../ui/auth-gate.js';
import { skeletonCard } from '../ui/skeleton.js';
import { listingCard } from '../ui/listing-card.js';
import { isSignedIn } from '../lib/auth.js';
import { toast } from '../ui/toast.js';

const PAGE_SIZE = 20;

function readFilters() {
  const params = new URLSearchParams(window.location.search);
  const categories = store.getState().categories;
  const category = params.get('category') || '';
  const condition = params.get('condition') || '';
  const sort = params.get('sort') || 'newest';

  return {
    q: (params.get('q') || '').trim().slice(0, 80),
    category: categoryBySlug(categories, category) ? category : '',
    min: (params.get('min') || '').replace(/[^\d]/g, ''),
    max: (params.get('max') || '').replace(/[^\d]/g, ''),
    condition: CONDITIONS.some((item) => item.value === condition) ? condition : '',
    photos: params.get('photos') === '1',
    sort: SORT_OPTIONS.some((item) => item.value === sort) ? sort : 'newest',
  };
}

function cleanNumber(value) {
  const digits = String(value ?? '').replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
}

export function render() {
  document.body.dataset.page = 'home';
  const state = store.getState();
  const filters = readFilters();
  const city = cityById(state.cities, state.cityId);

  let items = [];
  let total = 0;
  let nextCursor = null;
  let loading = false;
  let requestId = 0;
  let searchTimer = 0;

  const headEyebrow = h(
    'p',
    { class: 'home-head__eyebrow' },
    icon('map-pin', { size: 14 }),
    city ? cityLabel(city) : t('home.allCities'),
  );
  const headTitle = h('h1', { class: 'home-head__title' });
  const headSubtitle = h('p', { class: 'home-head__subtitle' }, t('home.subtitle'));

  const searchInput = h('input', {
    class: 'search-bar__input',
    type: 'search',
    name: 'q',
    value: filters.q,
    placeholder: t('home.searchPlaceholder'),
    'aria-label': t('home.searchLabel'),
    autocomplete: 'off',
    enterkeyhint: 'search',
  });
  const clearSearch = h(
    'button',
    {
      class: 'search-bar__clear',
      type: 'button',
      'aria-label': t('home.clearSearch'),
      onClick: () => {
        searchInput.value = '';
        filters.q = '';
        clearSearch.hidden = true;
        updateUrl();
        updateHead();
        loadFeed(true);
        searchInput.focus();
      },
    },
    icon('x', { size: 18 }),
  );
  clearSearch.hidden = !filters.q;

  const searchForm = h(
    'form',
    {
      class: 'home-search',
      role: 'search',
      onSubmit: (event) => {
        event.preventDefault();
        window.clearTimeout(searchTimer);
        filters.q = searchInput.value.trim().slice(0, 80);
        clearSearch.hidden = !filters.q;
        updateUrl();
        updateHead();
        loadFeed(true);
        searchInput.blur();
      },
    },
    h(
      'div',
      { class: 'search-bar' },
      h('span', { class: 'search-bar__icon' }, icon('search', { size: 20 })),
      searchInput,
      clearSearch,
    ),
  );

  searchInput.addEventListener('input', () => {
    clearSearch.hidden = !searchInput.value.trim();
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      filters.q = searchInput.value.trim().slice(0, 80);
      updateUrl();
      updateHead();
      loadFeed(true);
    }, 320);
  });
  onCleanup(() => window.clearTimeout(searchTimer));

  const chips = h('div', { class: 'chip-row', role: 'group', 'aria-label': t('filter.category') });
  const filterCount = h('span', { class: 'filter-count' });
  const filterTrigger = h(
    'button',
    { class: 'filter-trigger', type: 'button', onClick: () => openFilters() },
    icon('sliders-horizontal', { size: 17 }),
    h('span', {}, t('home.filters')),
    filterCount,
  );

  const sortSelect = h(
    'select',
    {
      class: 'sort-select',
      'aria-label': t('filter.sortLabel'),
      onChange: () => {
        filters.sort = sortSelect.value;
        updateUrl();
        loadFeed(true);
      },
    },
    SORT_OPTIONS.map((option) =>
      h(
        'option',
        { value: option.value, selected: option.value === filters.sort },
        t(option.labelKey),
      ),
    ),
  );

  const activeFilters = h('div', {
    class: 'active-filters',
    role: 'group',
    'aria-label': t('home.activeFilters'),
  });
  const resultsCount = h('p', { class: 'result-count', role: 'status', 'aria-live': 'polite' });
  const feed = h('div', { class: 'listing-grid listing-grid--home', 'aria-busy': 'true' });
  const sentinel = h('div', { class: 'feed-sentinel' });

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting) && nextCursor && !loading) {
        loadFeed(false);
      }
    },
    { rootMargin: '320px 0px' },
  );
  observer.observe(sentinel);
  onCleanup(() => observer.disconnect());

  const featuredSection = h('section', { class: 'featured-section', hidden: true });

  function filterCountValue() {
    let count = 0;
    if (filters.category) count += 1;
    if (filters.min || filters.max) count += 1;
    if (filters.condition) count += 1;
    if (filters.photos) count += 1;
    return count;
  }

  function hasRefinements() {
    return Boolean(
      filters.q ||
      filters.category ||
      filters.min ||
      filters.max ||
      filters.condition ||
      filters.photos,
    );
  }

  function updateHead() {
    const activeCity = cityById(store.getState().cities, store.getState().cityId);
    const category = categoryBySlug(store.getState().categories, filters.category);
    headEyebrow.replaceChildren(
      icon('map-pin', { size: 14 }),
      activeCity ? cityLabel(activeCity) : t('home.allCities'),
    );

    let title;
    if (filters.q) {
      title = t('home.searchResults', { query: filters.q });
    } else if (category) {
      title = t('home.categoryTitle', {
        category: categoryLabel(category),
        city: activeCity ? cityLabel(activeCity) : t('home.allCities'),
      });
    } else {
      title = activeCity ? t('home.title', { city: cityLabel(activeCity) }) : t('home.titleAll');
    }
    headTitle.textContent = title;
    setPageTitle(title);
  }

  function updateChips() {
    chips.replaceChildren(
      h(
        'button',
        {
          class: 'chip',
          type: 'button',
          'aria-pressed': String(!filters.category),
          onClick: () => {
            filters.category = '';
            updateChips();
            updateFilterState();
            updateHead();
            updateUrl();
            loadFeed(true);
          },
        },
        t('home.allCategories'),
      ),
      ...store.getState().categories.map((category) =>
        h(
          'button',
          {
            class: 'chip',
            type: 'button',
            'aria-pressed': String(filters.category === category.slug),
            onClick: () => {
              filters.category = category.slug;
              updateChips();
              updateFilterState();
              updateHead();
              updateUrl();
              loadFeed(true);
            },
          },
          icon(categoryIconName(category.slug), { size: 17, className: 'chip__icon' }),
          categoryLabel(category),
        ),
      ),
    );
  }

  function categoryIconName(slug) {
    const map = {
      mobiles: 'mobiles',
      laptops: 'laptops',
      furniture: 'furniture',
      appliances: 'appliances',
      bikes: 'bikes',
      cycles: 'cycles',
      books: 'books',
      'home-kitchen': 'home-kitchen',
    };
    return map[slug] || 'package';
  }

  function filterChip(label, onRemove) {
    return h(
      'button',
      {
        class: 'active-filter',
        type: 'button',
        'aria-label': `${label}, ${t('common.remove')}`,
        onClick: onRemove,
      },
      h('span', {}, label),
      icon('x', { size: 14 }),
    );
  }

  function updateFilterState() {
    const count = filterCountValue();
    filterCount.textContent = String(count);
    filterCount.hidden = count === 0;
    filterTrigger.setAttribute(
      'aria-label',
      count ? `${t('home.filters')}, ${count}` : t('home.filters'),
    );

    const chipsList = [];
    if (filters.min || filters.max) {
      const min = filters.min ? formatPrice(Number(filters.min)) : null;
      const max = filters.max ? formatPrice(Number(filters.max)) : null;
      const label =
        min && max
          ? `${min} – ${max}`
          : min
            ? `${t('filter.minPrice')}: ${min}`
            : `${t('filter.maxPrice')}: ${max}`;
      chipsList.push(
        filterChip(label, () => {
          filters.min = '';
          filters.max = '';
          updateFilterState();
          updateUrl();
          loadFeed(true);
        }),
      );
    }
    if (filters.condition) {
      chipsList.push(
        filterChip(conditionLabel(filters.condition), () => {
          filters.condition = '';
          updateFilterState();
          updateUrl();
          loadFeed(true);
        }),
      );
    }
    if (filters.photos) {
      chipsList.push(
        filterChip(t('filter.withPhotos'), () => {
          filters.photos = false;
          updateFilterState();
          updateUrl();
          loadFeed(true);
        }),
      );
    }
    if (chipsList.length) {
      chipsList.push(
        h(
          'button',
          {
            class: 'active-filter',
            type: 'button',
            onClick: clearAll,
          },
          t('home.clearAll'),
        ),
      );
    }
    activeFilters.replaceChildren(...chipsList);
    activeFilters.hidden = chipsList.length === 0;
  }

  function clearAll() {
    filters.q = '';
    filters.category = '';
    filters.min = '';
    filters.max = '';
    filters.condition = '';
    filters.photos = false;
    filters.sort = 'newest';
    searchInput.value = '';
    clearSearch.hidden = true;
    sortSelect.value = 'newest';
    updateChips();
    updateFilterState();
    updateHead();
    updateUrl();
    loadFeed(true);
  }

  function updateUrl() {
    const path = addQuery(currentPath().split('?')[0], {
      q: filters.q || null,
      category: filters.category || null,
      min: filters.min || null,
      max: filters.max || null,
      condition: filters.condition || null,
      photos: filters.photos ? '1' : null,
      sort: filters.sort !== 'newest' ? filters.sort : null,
    });
    replaceUrl(path);
  }

  function renderSentinel() {
    if (nextCursor) {
      const button = h(
        'button',
        {
          class: 'btn btn--secondary',
          type: 'button',
          onClick: () => loadFeed(false),
        },
        loading ? t('common.loading') : t('home.loadMore'),
      );
      button.disabled = loading;
      sentinel.replaceChildren(button);
    } else if (items.length) {
      sentinel.replaceChildren(h('p', { class: 'feed-end' }, t('home.end')));
    } else {
      sentinel.replaceChildren();
    }
  }

  async function loadFeed(reset = false) {
    const sequence = ++requestId;
    const activeCity = store.getState().cityId;
    const category = categoryBySlug(store.getState().categories, filters.category);

    if (reset) {
      items = [];
      total = 0;
      nextCursor = null;
      loading = false;
      feed.className = 'listing-grid listing-grid--home';
      feed.setAttribute('aria-busy', 'true');
      feed.replaceChildren(...Array.from({ length: 8 }, () => skeletonCard()));
      resultsCount.textContent = t('common.loading');
      sentinel.replaceChildren();
    }

    if (loading) return;
    loading = true;
    renderSentinel();

    try {
      const result = await api.listings.feed({
        cityId: activeCity,
        categoryId: category?.id || null,
        q: filters.q,
        minPrice: cleanNumber(filters.min),
        maxPrice: cleanNumber(filters.max),
        condition: filters.condition,
        withPhotos: filters.photos,
        sort: filters.sort,
        limit: PAGE_SIZE,
        cursor: reset ? 0 : nextCursor || 0,
      });
      if (sequence !== requestId) return;

      items = reset ? result.items : [...items, ...result.items];
      total = result.total;
      nextCursor = result.nextCursor;
      resultsCount.textContent = t('home.results', { count: total });

      if (!items.length) {
        const refined = hasRefinements();
        feed.className = '';
        feed.setAttribute('aria-busy', 'false');
        feed.replaceChildren(
          emptyState({
            iconName: refined ? 'search' : 'inbox',
            title: refined ? t('home.noResultsTitle') : t('home.emptyTitle'),
            body: refined ? t('home.noResultsBody') : t('home.emptyBody'),
            actions: refined
              ? [
                  {
                    label: t('home.clearFilters'),
                    onClick: clearAll,
                    variant: 'primary',
                  },
                ]
              : [{ label: t('home.emptyAction'), href: '/sell', variant: 'primary' }],
          }),
        );
      } else {
        feed.className = 'listing-grid listing-grid--home';
        feed.setAttribute('aria-busy', 'false');
        feed.replaceChildren(...items.map((item) => listingCard(item)));
      }

      renderSentinel();
      if (nextCursor) {
        observer.unobserve(sentinel);
        observer.observe(sentinel);
      }
    } catch {
      if (sequence !== requestId) return;
      feed.className = '';
      feed.setAttribute('aria-busy', 'false');
      resultsCount.textContent = '';
      feed.replaceChildren(
        errorState({
          body: t('errors.loadFailed'),
          onRetry: () => loadFeed(true),
        }),
      );
      sentinel.replaceChildren();
    } finally {
      if (sequence === requestId) loading = false;
    }
  }

  function openFilters() {
    const stateNow = store.getState();
    const formId = 'listing-filters';
    const errorBox = h('div', { role: 'alert' });
    const minInput = h('input', {
      class: 'field__input',
      id: 'filter-min',
      type: 'text',
      inputMode: 'numeric',
      value: filters.min,
      placeholder: t('filter.minPrice'),
      'aria-label': t('filter.minPrice'),
    });
    const maxInput = h('input', {
      class: 'field__input',
      id: 'filter-max',
      type: 'text',
      inputMode: 'numeric',
      value: filters.max,
      placeholder: t('filter.maxPrice'),
      'aria-label': t('filter.maxPrice'),
    });
    const citySelect = h(
      'select',
      { class: 'field__select', id: 'filter-city', 'aria-label': t('filter.city') },
      stateNow.cities.map((city) =>
        h('option', { value: city.id, selected: city.id === stateNow.cityId }, cityLabel(city)),
      ),
      h('option', { value: '', selected: !stateNow.cityId }, t('home.allCities')),
    );
    const categorySelect = h(
      'select',
      { class: 'field__select', id: 'filter-category', 'aria-label': t('filter.category') },
      h('option', { value: '' }, t('home.allCategories')),
      stateNow.categories.map((category) =>
        h(
          'option',
          { value: category.slug, selected: category.slug === filters.category },
          categoryLabel(category),
        ),
      ),
    );
    const conditionSelect = h(
      'select',
      { class: 'field__select', id: 'filter-condition', 'aria-label': t('filter.condition') },
      h('option', { value: '' }, t('filter.any')),
      CONDITIONS.map((condition) =>
        h(
          'option',
          { value: condition.value, selected: condition.value === filters.condition },
          t(condition.labelKey),
        ),
      ),
    );
    const photosInput = h('input', { type: 'checkbox', checked: filters.photos });

    const resetButton = h(
      'button',
      {
        class: 'btn btn--secondary',
        type: 'button',
        onClick: () => {
          citySelect.value = stateNow.cityId || '';
          categorySelect.value = '';
          conditionSelect.value = '';
          minInput.value = '';
          maxInput.value = '';
          photosInput.checked = false;
          errorBox.replaceChildren();
        },
      },
      t('filter.reset'),
    );
    const applyButton = h(
      'button',
      { class: 'btn btn--primary', type: 'submit', form: formId },
      t('filter.apply'),
    );

    const form = h(
      'form',
      {
        class: 'form',
        id: formId,
        onSubmit: (event) => {
          event.preventDefault();
          errorBox.replaceChildren();
          const min = cleanNumber(minInput.value);
          const max = cleanNumber(maxInput.value);
          if (min !== null && max !== null && min > max) {
            errorBox.appendChild(
              h(
                'p',
                { class: 'field__error' },
                icon('alert-circle', { size: 16 }),
                h('span', {}, t('filter.priceRangeError')),
              ),
            );
            return;
          }

          filters.min = min === null ? '' : String(min);
          filters.max = max === null ? '' : String(max);
          filters.category = categorySelect.value;
          filters.condition = conditionSelect.value;
          filters.photos = photosInput.checked;
          const nextCityId = citySelect.value || null;
          if (nextCityId !== store.getState().cityId) {
            setCityPreference(nextCityId);
          }

          handle.close();
          updateChips();
          updateFilterState();
          updateHead();
          updateUrl();
          loadFeed(true);
        },
      },
      h(
        'div',
        { class: 'filter-group' },
        h(
          'div',
          { class: 'field' },
          h('label', { class: 'field__label', for: 'filter-city' }, t('filter.city')),
          citySelect,
        ),
      ),
      h(
        'div',
        { class: 'filter-group' },
        h(
          'div',
          { class: 'field' },
          h('label', { class: 'field__label', for: 'filter-category' }, t('filter.category')),
          categorySelect,
        ),
      ),
      h(
        'div',
        { class: 'filter-group' },
        h(
          'div',
          { class: 'field' },
          h('label', { class: 'field__label', for: 'filter-min' }, t('filter.price')),
          h(
            'div',
            { class: 'price-range' },
            minInput,
            h('span', { class: 'price-range__sep' }, '–'),
            maxInput,
          ),
        ),
      ),
      h(
        'div',
        { class: 'filter-group' },
        h(
          'div',
          { class: 'field' },
          h('label', { class: 'field__label', for: 'filter-condition' }, t('filter.condition')),
          conditionSelect,
        ),
        h('label', { class: 'checkbox' }, photosInput, h('span', {}, t('filter.withPhotos'))),
      ),
      errorBox,
    );

    const handle = openSheet({
      title: t('home.filterTitle'),
      content: form,
      actions: [resetButton, applyButton],
    });
  }

  function loadFeatured() {
    api.listings
      .featured({ cityId: store.getState().cityId, limit: 8 })
      .then((featured) => {
        if (!featured.length) return;
        featuredSection.replaceChildren(
          h(
            'div',
            { class: 'featured-section__head' },
            h(
              'div',
              {},
              h(
                'h2',
                { class: 'featured-section__title' },
                icon('sparkles', { size: 19 }),
                t('home.featured'),
              ),
              h('p', { class: 'text-xs text-muted' }, t('home.featuredSubtitle')),
            ),
          ),
          h(
            'div',
            { class: 'featured-strip' },
            featured.map((listing) => listingCard(listing, { mini: true })),
          ),
        );
        featuredSection.hidden = false;
      })
      .catch(() => {
        featuredSection.hidden = true;
      });
  }

  updateChips();
  updateFilterState();
  updateHead();
  loadFeed(true);
  loadFeatured();

  const signedIn = isSignedIn();
  const saveSearchButton = signedIn
    ? h(
        'button',
        {
          class: 'btn btn--secondary btn--sm',
          type: 'button',
          'aria-label': t('savedSearches.create'),
          onClick: () => openSaveSearchSheet(),
        },
        t('savedSearches.create'),
      )
    : null;

  async function openSaveSearchSheet() {
    const nameInput = h('input', {
      class: 'field__input',
      type: 'text',
      id: 'save-search-name',
      placeholder: t('savedSearches.namePlaceholder'),
      'aria-label': t('savedSearches.name'),
      maxlength: '80',
    });
    const errorBox = h('div', { role: 'alert' });

    const form = h(
      'form',
      {
        class: 'form',
        onSubmit: async (event) => {
          event.preventDefault();
          errorBox.replaceChildren();
          const name = String(nameInput.value ?? '')
            .trim()
            .slice(0, 80);
          if (!name) {
            errorBox.appendChild(
              h(
                'p',
                { class: 'field__error' },
                icon('alert-circle', { size: 16 }),
                h('span', {}, t('savedSearches.invalidName')),
              ),
            );
            nameInput.focus();
            return;
          }
          try {
            await api.savedSearches.create({
              name,
              query: {
                q: filters.q,
                category: filters.category,
                min: filters.min,
                max: filters.max,
                condition: filters.condition,
                photos: filters.photos,
                sort: filters.sort,
                cityId: state.cityId,
              },
            });
            toast.success(t('savedSearches.created'));
            handle.close();
          } catch {
            toast.error(t('common.genericError'));
          }
        },
      },
      h(
        'div',
        { class: 'field' },
        h('label', { class: 'field__label', for: 'save-search-name' }, t('savedSearches.name')),
        nameInput,
      ),
      errorBox,
      h(
        'div',
        { class: 'form__actions' },
        h(
          'button',
          { class: 'btn btn--secondary', type: 'button', onClick: () => handle.close() },
          t('common.cancel'),
        ),
        h('button', { class: 'btn btn--primary', type: 'submit' }, t('common.save')),
      ),
    );

    const handle = openSheet({
      title: t('savedSearches.create'),
      content: form,
    });
  }

  return h(
    'div',
    { class: 'container page' },
    h('div', { class: 'home-head' }, headEyebrow, headTitle, headSubtitle),
    searchForm,
    chips,
    h(
      'div',
      { class: 'home-toolbar' },
      h('div', { class: 'home-toolbar__filters' }, filterTrigger),
      h('div', { class: 'home-toolbar__right' }, sortSelect, saveSearchButton),
    ),
    activeFilters,
    h(
      'div',
      { class: 'home-results' },
      h('div', { class: 'results-head' }, resultsCount),
      feed,
      sentinel,
    ),
    featuredSection,
  );
}

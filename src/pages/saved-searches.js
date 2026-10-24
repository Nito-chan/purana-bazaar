import { api } from '../api/index.js';
import { h } from '../lib/dom.js';
import { buildQuery, currentPath } from '../lib/url.js';
import { formatPrice } from '../lib/format.js';
import { navigate } from '../lib/navigation.js';
import { setPageTitle } from '../lib/seo.js';
import { setCityPreference, store } from '../store.js';
import { categoryLabel, cityLabel, conditionLabel, t } from '../i18n/index.js';
import { authRequiredState, errorState } from '../ui/auth-gate.js';
import { emptyState } from '../ui/empty.js';
import { confirmSheet } from '../ui/confirm-sheet.js';
import { openSheet } from '../ui/sheet.js';
import { icon } from '../ui/icons.js';
import { toast } from '../ui/toast.js';

function hasValue(value) {
  return value !== null && value !== undefined && value !== '';
}

function queryLabel(query, categoriesById, citiesById) {
  const parts = [];
  if (query.q) parts.push(`“${query.q}”`);
  if (query.category) {
    const category = categoriesById.get(query.category);
    parts.push(category ? categoryLabel(category) : query.category);
  }
  if (query.cityId) {
    const city = citiesById.get(query.cityId);
    parts.push(city ? cityLabel(city) : query.cityId);
  }
  if (hasValue(query.min) || hasValue(query.max)) {
    const min = hasValue(query.min) ? formatPrice(query.min) : '';
    const max = hasValue(query.max) ? formatPrice(query.max) : '';
    parts.push(`${min} – ${max}`);
  }
  if (query.condition) parts.push(conditionLabel(query.condition));
  return parts.length ? parts.join(' · ') : t('savedSearches.allListings');
}

export async function render() {
  document.body.dataset.page = 'savedSearches';
  setPageTitle(t('savedSearches.title'));

  const state = store.getState();
  if (state.auth.status !== 'signedIn') {
    return h(
      'div',
      { class: 'container page' },
      h('h1', { class: 'page-title' }, t('savedSearches.title')),
      h('div', { style: { marginTop: '16px' } }, authRequiredState({ next: currentPath() })),
    );
  }

  const userId = state.auth.user.id;
  const categoriesById = new Map(state.categories.map((category) => [category.id, category]));
  const citiesById = new Map(state.cities.map((city) => [city.id, city]));

  let searches;
  try {
    searches = await api.savedSearches.list();
  } catch {
    return h(
      'div',
      { class: 'container page' },
      h('h1', { class: 'page-title' }, t('savedSearches.title')),
      h(
        'div',
        { style: { marginTop: '16px' } },
        errorState({ onRetry: () => navigate('/saved-searches') }),
      ),
    );
  }

  let mine = searches.filter((item) => item.userId === userId);

  async function removeSearch(item) {
    const confirmed = await confirmSheet({
      title: t('savedSearches.confirmDelete'),
      body: `“${item.name}”`,
      confirmLabel: t('savedSearches.delete'),
      danger: true,
    });
    if (!confirmed) return;
    try {
      await api.savedSearches.delete(item.id);
      toast.success(t('savedSearches.deleted'));
      await reload();
    } catch {
      toast.error(t('common.genericError'));
    }
  }

  async function toggleNotify(item) {
    try {
      await api.savedSearches.update(item.id, {
        name: item.name,
        query: item.query,
        notify: !item.notify,
      });
      toast.success(item.notify ? t('savedSearches.updated') : t('savedSearches.updated'));
      await reload();
    } catch {
      toast.error(t('common.genericError'));
    }
  }

  async function editName(item) {
    const nameInput = h('input', {
      class: 'field__input',
      type: 'text',
      id: 'edit-search-name',
      value: item.name,
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
            await api.savedSearches.update(item.id, {
              name,
              query: item.query,
              notify: item.notify,
            });
            toast.success(t('savedSearches.updated'));
            handle.close();
            await reload();
          } catch {
            toast.error(t('common.genericError'));
          }
        },
      },
      h(
        'div',
        { class: 'field' },
        h('label', { class: 'field__label', for: 'edit-search-name' }, t('savedSearches.name')),
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
        h('button', { class: 'btn btn--primary', type: 'submit' }, t('savedSearches.updated')),
      ),
    );

    const handle = openSheet({
      title: t('savedSearches.edit'),
      content: form,
    });
  }

  function applySearch(item) {
    const query = item.query || {};
    const nextCityId = query.cityId || null;
    if (nextCityId !== store.getState().cityId) {
      setCityPreference(nextCityId);
    }
    const params = {};
    if (query.q) params.q = query.q;
    if (query.category) params.category = query.category;
    if (hasValue(query.min)) params.min = String(query.min);
    if (hasValue(query.max)) params.max = String(query.max);
    if (query.condition) params.condition = query.condition;
    if (query.photos) params.photos = '1';
    if (query.sort) params.sort = query.sort;
    navigate(`/${buildQuery(params)}`);
  }

  async function reload() {
    try {
      searches = await api.savedSearches.list();
      mine = searches.filter((item) => item.userId === userId);
      renderList();
    } catch {
      toast.error(t('common.genericError'));
    }
  }

  const listHost = h('div', { id: 'saved-searches-list' });

  function renderList() {
    listHost.replaceChildren();
    if (!mine.length) {
      listHost.appendChild(
        emptyState({
          iconName: 'save',
          title: t('savedSearches.emptyTitle'),
          body: t('savedSearches.emptyBody'),
          actions: [{ label: t('savedSearches.emptyAction'), href: '/', variant: 'primary' }],
        }),
      );
      return;
    }
    listHost.replaceChildren(
      ...mine.map((item) => {
        const isNotifying = Boolean(item.notify);
        return h(
          'article',
          { class: 'saved-search' },
          h(
            'div',
            { class: 'saved-search__head' },
            h('h3', { class: 'saved-search__name' }, item.name),
            h(
              'span',
              { class: 'saved-search__query' },
              queryLabel(item.query, categoriesById, citiesById),
            ),
          ),
          h(
            'div',
            { class: 'saved-search__actions' },
            h(
              'button',
              {
                class: 'btn btn--primary btn--sm',
                type: 'button',
                onClick: () => applySearch(item),
              },
              icon('search', { size: 16 }),
              t('savedSearches.apply'),
            ),
            h(
              'button',
              {
                class: `btn btn--${isNotifying ? 'secondary' : 'outline'} btn--sm`,
                type: 'button',
                'aria-pressed': String(isNotifying),
                'aria-label': t(isNotifying ? 'savedSearches.notifyOn' : 'savedSearches.notifyOff'),
                onClick: () => toggleNotify(item),
              },
              icon('bell', { size: 16 }),
            ),
            h(
              'button',
              {
                class: 'btn btn--secondary btn--sm',
                type: 'button',
                onClick: () => editName(item),
              },
              icon('pencil', { size: 16 }),
              t('savedSearches.edit'),
            ),
            h(
              'button',
              {
                class: 'btn btn--danger btn--sm',
                type: 'button',
                onClick: () => removeSearch(item),
              },
              icon('trash-2', { size: 16 }),
              t('savedSearches.delete'),
            ),
          ),
        );
      }),
    );
  }

  renderList();

  return h(
    'div',
    { class: 'container page' },
    h(
      'div',
      { class: 'page-head' },
      h(
        'div',
        {},
        h('h1', { class: 'page-title' }, t('savedSearches.title')),
        h('p', { class: 'text-muted' }, t('savedSearches.subtitle')),
      ),
    ),
    h('div', { style: { marginTop: '20px' } }, listHost),
  );
}

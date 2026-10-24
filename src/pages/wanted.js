import { api } from '../api/index.js';
import { h } from '../lib/dom.js';
import { formatRelativeTime, formatPrice } from '../lib/format.js';
import { categoryLabel, cityLabel, t } from '../i18n/index.js';
import { currentUser } from '../lib/auth.js';
import { navigate } from '../lib/navigation.js';
import { setPageTitle } from '../lib/seo.js';
import { store } from '../store.js';
import { errorState } from '../ui/auth-gate.js';
import { emptyState } from '../ui/empty.js';
import { confirmSheet } from '../ui/confirm-sheet.js';
import { openSheet } from '../ui/sheet.js';
import { icon } from '../ui/icons.js';
import { toast } from '../ui/toast.js';

export async function render() {
  document.body.dataset.page = 'wanted';
  setPageTitle(t('wantedPosts.title'));

  const state = store.getState();
  const language = state.language;
  const user = currentUser();
  const signedIn = state.auth.status === 'signedIn';
  const citiesById = new Map(state.cities.map((city) => [city.id, city]));
  const categoriesById = new Map(state.categories.map((category) => [category.id, category]));

  let posts;
  try {
    posts = await api.wantedPosts.list();
  } catch {
    return h(
      'div',
      { class: 'container page' },
      h('h1', { class: 'page-title' }, t('wantedPosts.title')),
      h(
        'div',
        { style: { marginTop: '16px' } },
        errorState({ onRetry: () => navigate('/wanted') }),
      ),
    );
  }

  let openPosts = posts.filter((post) => post.status === 'open');

  function cityName(cityId) {
    const city = cityId ? citiesById.get(cityId) : null;
    return city ? cityLabel(city) : '';
  }

  function categoryName(categoryId) {
    const category = categoryId ? categoriesById.get(categoryId) : null;
    return category ? categoryLabel(category) : '';
  }

  function postMeta(post) {
    const parts = [cityName(post.cityId), categoryName(post.categoryId)].filter(Boolean);
    if (post.budget !== null) parts.push(formatPrice(post.budget));
    return parts.join(' · ');
  }

  function postCard(post) {
    const isMine = post.userId === (user?.id ?? '');
    return h(
      'article',
      { class: 'wanted-post' },
      h(
        'div',
        { class: 'wanted-post__head' },
        h('h3', { class: 'wanted-post__title' }, post.title),
        h(
          'span',
          { class: 'wanted-post__meta' },
          t('wantedPosts.poster', { name: post.posterName }),
        ),
        h(
          'span',
          { class: 'wanted-post__meta' },
          t('wantedPosts.expires', { date: formatRelativeTime(post.expiresAt, language) }),
        ),
      ),
      h('p', { class: 'wanted-post__body' }, post.description),
      h(
        'div',
        { class: 'wanted-post__footer' },
        h('span', { class: 'wanted-post__meta' }, postMeta(post)),
      ),
      h(
        'div',
        { class: 'wanted-post__actions' },
        isMine
          ? h(
              'button',
              {
                class: 'btn btn--secondary btn--sm',
                type: 'button',
                onClick: () => openForm(post),
              },
              icon('pencil', { size: 16 }),
              t('wantedPosts.edit'),
            )
          : null,
        isMine && post.status === 'open'
          ? h(
              'button',
              {
                class: 'btn btn--outline btn--sm',
                type: 'button',
                onClick: () => closePost(post),
              },
              t('wantedPosts.closed'),
            )
          : null,
        isMine
          ? h(
              'button',
              {
                class: 'btn btn--danger btn--sm',
                type: 'button',
                onClick: () => deletePost(post),
              },
              icon('trash-2', { size: 16 }),
              t('wantedPosts.delete'),
            )
          : null,
      ),
    );
  }

  async function deletePost(post) {
    const confirmed = await confirmSheet({
      title: t('wantedPosts.confirmDelete'),
      body: `“${post.title}”`,
      confirmLabel: t('wantedPosts.delete'),
      danger: true,
    });
    if (!confirmed) return;
    try {
      await api.wantedPosts.delete(post.id);
      toast.success(t('wantedPosts.deleted'));
      await reload();
    } catch {
      toast.error(t('common.genericError'));
    }
  }

  async function closePost(post) {
    try {
      await api.wantedPosts.update(post.id, { status: 'closed' });
      toast.success(t('wantedPosts.closed'));
      await reload();
    } catch {
      toast.error(t('common.genericError'));
    }
  }

  async function openForm(post = null) {
    const editing = Boolean(post);
    const titleInput = h('input', {
      class: 'field__input',
      type: 'text',
      id: 'wanted-title',
      placeholder: t('wantedPosts.titlePlaceholder'),
      'aria-label': t('wantedPosts.titleLabel'),
      value: editing ? post.title : '',
      maxlength: '80',
    });
    const descriptionInput = h('textarea', {
      class: 'field__textarea',
      id: 'wanted-description',
      placeholder: t('wantedPosts.descriptionPlaceholder'),
      'aria-label': t('wantedPosts.descriptionLabel'),
      value: editing ? post.description : '',
      rows: '4',
      maxlength: '1000',
    });
    const citySelect = h(
      'select',
      { class: 'field__select', id: 'wanted-city', 'aria-label': t('wantedPosts.cityLabel') },
      h('option', { value: '' }, t('home.allCities')),
      ...state.cities.map((city) =>
        h(
          'option',
          { value: city.id, selected: editing ? post.cityId === city.id : false },
          cityLabel(city),
        ),
      ),
    );
    const categorySelect = h(
      'select',
      {
        class: 'field__select',
        id: 'wanted-category',
        'aria-label': t('wantedPosts.categoryLabel'),
      },
      h('option', { value: '' }, t('home.allCategories')),
      ...state.categories.map((category) =>
        h(
          'option',
          { value: category.id, selected: editing ? post.categoryId === category.id : false },
          categoryLabel(category),
        ),
      ),
    );
    const budgetInput = h('input', {
      class: 'field__input',
      type: 'text',
      id: 'wanted-budget',
      inputMode: 'numeric',
      placeholder: t('wantedPosts.budgetPlaceholder'),
      'aria-label': t('wantedPosts.budgetLabel'),
      value: editing && post.budget !== null ? String(post.budget) : '',
      maxlength: '11',
    });

    const errorBox = h('div', { role: 'alert' });

    const submitButton = h(
      'button',
      { class: 'btn btn--primary', type: 'submit' },
      editing ? t('wantedPosts.updating') : t('wantedPosts.post'),
    );

    const form = h(
      'form',
      {
        class: 'form',
        onSubmit: async (event) => {
          event.preventDefault();
          errorBox.replaceChildren();
          const title = String(titleInput.value ?? '')
            .trim()
            .slice(0, 80);
          const description = String(descriptionInput.value ?? '')
            .trim()
            .slice(0, 1000);
          const cityId = citySelect.value || null;
          const categoryId = categorySelect.value || null;
          const budgetRaw = String(budgetInput.value ?? '').replace(/[^\d]/g, '');
          const budget = budgetRaw ? Number(budgetRaw) : null;
          if (!title) {
            errorBox.appendChild(
              h(
                'p',
                { class: 'field__error' },
                icon('alert-circle', { size: 16 }),
                h('span', {}, t('wantedPosts.invalidTitle')),
              ),
            );
            titleInput.focus();
            return;
          }
          if (budget !== null && (!Number.isInteger(budget) || budget < 0)) {
            errorBox.appendChild(
              h(
                'p',
                { class: 'field__error' },
                icon('alert-circle', { size: 16 }),
                h('span', {}, t('wantedPosts.invalidBudget')),
              ),
            );
            budgetInput.focus();
            return;
          }
          try {
            submitButton.disabled = true;
            submitButton.textContent = editing ? t('wantedPosts.updating') : t('wantedPosts.post');
            if (editing) {
              await api.wantedPosts.update(post.id, {
                title,
                description,
                cityId,
                categoryId,
                budget,
              });
              toast.success(t('wantedPosts.updated'));
            } else {
              await api.wantedPosts.create({ title, description, cityId, categoryId, budget });
              toast.success(t('wantedPosts.posted'));
            }
            handle.close();
            await reload();
          } catch {
            toast.error(t('common.genericError'));
          } finally {
            submitButton.disabled = false;
            submitButton.textContent = editing ? t('wantedPosts.updating') : t('wantedPosts.post');
          }
        },
      },
      h(
        'div',
        { class: 'field' },
        h('label', { class: 'field__label', for: 'wanted-title' }, t('wantedPosts.titleLabel')),
        titleInput,
      ),
      h(
        'div',
        { class: 'field' },
        h(
          'label',
          { class: 'field__label', for: 'wanted-description' },
          t('wantedPosts.descriptionLabel'),
        ),
        descriptionInput,
      ),
      h(
        'div',
        { class: 'field' },
        h('label', { class: 'field__label', for: 'wanted-city' }, t('wantedPosts.cityLabel')),
        citySelect,
      ),
      h(
        'div',
        { class: 'field' },
        h(
          'label',
          { class: 'field__label', for: 'wanted-category' },
          t('wantedPosts.categoryLabel'),
        ),
        categorySelect,
      ),
      h(
        'div',
        { class: 'field' },
        h('label', { class: 'field__label', for: 'wanted-budget' }, t('wantedPosts.budgetLabel')),
        budgetInput,
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
        submitButton,
      ),
    );

    const handle = openSheet({
      title: editing ? t('wantedPosts.edit') : t('wantedPosts.create'),
      content: form,
    });
  }

  async function reload() {
    try {
      posts = await api.wantedPosts.list();
      openPosts = posts.filter((post) => post.status === 'open');
      renderList();
    } catch {
      toast.error(t('common.genericError'));
    }
  }

  const listHost = h('div', { id: 'wanted-list' });

  function renderList() {
    listHost.replaceChildren();
    if (!openPosts.length) {
      listHost.appendChild(
        emptyState({
          iconName: 'list',
          title: t('wantedPosts.emptyTitle'),
          body: t('wantedPosts.emptyBody'),
          actions: signedIn
            ? [
                {
                  label: t('wantedPosts.create'),
                  onClick: () => openForm(),
                  variant: 'primary',
                },
              ]
            : [],
        }),
      );
      return;
    }
    listHost.replaceChildren(...openPosts.map(postCard));
  }

  renderList();

  const createButton = signedIn
    ? h(
        'button',
        { class: 'btn btn--primary', type: 'button', onClick: () => openForm() },
        icon('plus', { size: 18 }),
        t('wantedPosts.create'),
      )
    : null;

  return h(
    'div',
    { class: 'container page' },
    h(
      'div',
      { class: 'page-head' },
      h(
        'div',
        {},
        h('h1', { class: 'page-title' }, t('wantedPosts.title')),
        h('p', { class: 'text-muted' }, t('wantedPosts.subtitle')),
      ),
      createButton,
    ),
    h('div', { style: { marginTop: '20px' } }, listHost),
  );
}

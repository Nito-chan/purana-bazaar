import { api } from '../api/index.js';
import { h } from '../lib/dom.js';
import { MAX_PHOTOS } from '../lib/constants.js';
import { CONDITIONS } from '../lib/constants.js';
import { errorMessage, t, cityLabel, categoryLabel } from '../i18n/index.js';
import { parsePriceInput } from '../lib/format.js';
import { listingPath } from '../lib/url.js';
import { navigate } from '../lib/navigation.js';
import { onCleanup } from '../lib/lifecycle.js';
import { isSignedIn } from '../lib/auth.js';
import { setPageTitle } from '../lib/seo.js';
import { getSellDraft, saveSellDraft, clearSellDraft } from '../lib/storage.js';
import { store } from '../store.js';
import { validateListing } from '../lib/validation.js';
import { authRequiredState, errorState } from '../ui/auth-gate.js';
import { icon } from '../ui/icons.js';
import { toast } from '../ui/toast.js';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('read-failed'));
    reader.readAsDataURL(file);
  });
}

export async function render({ params, query = {} }) {
  document.body.dataset.page = 'sell';
  const editing = Boolean(params?.id);
  const title = editing ? t('sell.editTitle') : t('sell.title');
  setPageTitle(title);

  if (!isSignedIn()) {
    return h(
      'div',
      { class: 'container page' },
      h('h1', { class: 'page-title' }, title),
      h(
        'p',
        { class: 'text-muted', style: { marginTop: '6px', marginBottom: '20px' } },
        t('sell.subtitle'),
      ),
      authRequiredState({
        title: t('sell.loginTitle'),
        body: t('sell.loginBody'),
        next: editing ? `/sell/${params.id}` : '/sell',
      }),
    );
  }

  let existing = null;
  if (editing) {
    try {
      existing = await api.listings.get(params.id);
    } catch {
      return h(
        'div',
        { class: 'container page' },
        errorState({
          title: t('listing.notFoundTitle'),
          body: t('listing.notFoundBody'),
          onRetry: () => navigate('/my-listings'),
        }),
      );
    }
    if (!existing.isMine) {
      return h(
        'div',
        { class: 'container page' },
        errorState({
          title: t('sell.editNotFound'),
          body: t('sell.editNotFound'),
          onRetry: () => navigate('/my-listings'),
        }),
      );
    }
  }

  const state = store.getState();
  const draft = !editing ? getSellDraft() : null;
  const initial = editing ? existing : draft && typeof draft === 'object' ? draft : {};

  let photos = editing ? (existing.images || []).map((image) => image.url) : [];
  let saving = false;
  let draftTimer = 0;

  const errorNodes = new Map();
  const inputs = new Map();

  function fieldError(name) {
    const node = h('p', { class: 'field__error', id: `sell-${name}-error`, hidden: true });
    errorNodes.set(name, node);
    return node;
  }

  function clearError(name) {
    const node = errorNodes.get(name);
    const input = inputs.get(name);
    if (node) {
      node.hidden = true;
      node.replaceChildren();
    }
    if (input) input.removeAttribute('aria-invalid');
  }

  function showError(name, messageKey) {
    const node = errorNodes.get(name);
    const input = inputs.get(name);
    if (!node) return;
    node.replaceChildren(icon('alert-circle', { size: 15 }), h('span', {}, t(messageKey)));
    node.hidden = false;
    if (input) input.setAttribute('aria-invalid', 'true');
  }

  function clearAllErrors() {
    for (const name of errorNodes.keys()) clearError(name);
  }

  function input(name, node) {
    inputs.set(name, node);
    node.addEventListener('input', () => clearError(name));
    node.addEventListener('change', () => clearError(name));
    return node;
  }

  const photoGrid = h('div', { class: 'photo-grid', tabindex: '-1' });
  const photoError = fieldError('photos');
  const photoInput = h('input', {
    type: 'file',
    accept: 'image/png,image/jpeg,image/webp,image/gif',
    multiple: true,
    'aria-label': t('sell.addPhotos'),
    'aria-describedby': 'sell-photos-error',
    onChange: async (event) => {
      const files = Array.from(event.target.files || []);
      event.target.value = '';
      clearError('photos');
      if (!files.length) return;
      if (photos.length + files.length > MAX_PHOTOS) {
        toast.error(t('errors.tooManyPhotos'));
        return;
      }
      const next = [];
      for (const file of files) {
        if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) continue;
        if (file.size > MAX_PHOTO_BYTES) {
          toast.error(t('errors.imageTooLarge'));
          continue;
        }
        try {
          next.push(await readFile(file));
        } catch {
          toast.error(t('common.genericError'));
        }
      }
      photos = [...photos, ...next].slice(0, MAX_PHOTOS);
      renderPhotos();
      scheduleDraft();
    },
  });

  function renderPhotos() {
    const tiles = photos.map((url, index) =>
      h(
        'div',
        { class: 'photo-item' },
        h('img', {
          src: url,
          alt: t('common.photo', { count: index + 1 }),
          width: 200,
          height: 200,
        }),
        h(
          'button',
          {
            class: 'photo-item__remove',
            type: 'button',
            'aria-label': t('sell.removePhoto'),
            onClick: () => {
              photos = photos.filter((_, photoIndex) => photoIndex !== index);
              renderPhotos();
              scheduleDraft();
            },
          },
          icon('x', { size: 16 }),
        ),
      ),
    );

    const addTile =
      photos.length < MAX_PHOTOS
        ? h(
            'label',
            { class: 'photo-add' },
            icon('camera', { size: 22 }),
            h('span', {}, t('sell.addPhotos')),
            photoInput,
          )
        : null;

    photoGrid.replaceChildren(...tiles, ...(addTile ? [addTile] : []));
  }

  function scheduleDraft() {
    if (editing) return;
    window.clearTimeout(draftTimer);
    draftTimer = window.setTimeout(() => {
      saveSellDraft({
        title: inputs.get('title')?.value || '',
        price: inputs.get('price')?.value || '',
        categoryId: inputs.get('categoryId')?.value || '',
        condition: inputs.get('condition')?.value || '',
        cityId: inputs.get('cityId')?.value || '',
        area: inputs.get('area')?.value || '',
        description: inputs.get('description')?.value || '',
        isNegotiable: Boolean(inputs.get('isNegotiable')?.checked),
      });
    }, 450);
  }
  onCleanup(() => window.clearTimeout(draftTimer));

  const defaultCity =
    state.cities.find((city) => city.id === query.city || city.slug === query.city) || null;
  const defaultPresetCategory =
    state.categories.find(
      (category) => category.id === query.category || category.slug === query.category,
    ) || null;
  const defaultCityId =
    initial.cityId ||
    defaultCity?.id ||
    state.auth.user?.cityId ||
    state.cityId ||
    state.cities[0]?.id ||
    '';
  const defaultCategory = state.categories.find((item) => item.slug === initial.category) || null;
  const defaultCategoryId =
    initial.categoryId || defaultCategory?.id || defaultPresetCategory?.id || '';

  const titleInput = input(
    'title',
    h('input', {
      class: 'field__input',
      id: 'sell-title',
      name: 'title',
      type: 'text',
      maxlength: '80',
      value: initial.title || '',
      placeholder: t('sell.titlePlaceholder'),
      autocomplete: 'off',
      'aria-describedby': 'sell-title-error',
      onInput: scheduleDraft,
    }),
  );
  const priceInput = input(
    'price',
    h('input', {
      class: 'field__input',
      id: 'sell-price',
      name: 'price',
      type: 'text',
      inputMode: 'numeric',
      value: initial.price ? String(initial.price) : '',
      placeholder: t('sell.pricePlaceholder'),
      autocomplete: 'off',
      'aria-describedby': 'sell-price-error',
      onInput: scheduleDraft,
    }),
  );
  const negotiableInput = h('input', {
    type: 'checkbox',
    name: 'isNegotiable',
    checked: initial.isNegotiable !== false,
    onChange: scheduleDraft,
  });
  inputs.set('isNegotiable', negotiableInput);

  const categorySelect = input(
    'categoryId',
    h(
      'select',
      {
        class: 'field__select',
        id: 'sell-category',
        name: 'categoryId',
        'aria-describedby': 'sell-categoryId-error',
        onChange: scheduleDraft,
      },
      h('option', { value: '' }, t('sell.categoryPlaceholder')),
      state.categories.map((category) =>
        h(
          'option',
          { value: category.id, selected: category.id === defaultCategoryId },
          categoryLabel(category),
        ),
      ),
    ),
  );

  const conditionSelect = input(
    'condition',
    h(
      'select',
      {
        class: 'field__select',
        id: 'sell-condition',
        name: 'condition',
        'aria-describedby': 'sell-condition-error',
        onChange: scheduleDraft,
      },
      h('option', { value: '' }, t('sell.conditionPlaceholder')),
      CONDITIONS.map((condition) =>
        h(
          'option',
          { value: condition.value, selected: condition.value === (initial.condition || 'good') },
          t(condition.labelKey),
        ),
      ),
    ),
  );

  const citySelect = input(
    'cityId',
    h(
      'select',
      {
        class: 'field__select',
        id: 'sell-city',
        name: 'cityId',
        'aria-describedby': 'sell-cityId-error',
        onChange: scheduleDraft,
      },
      h('option', { value: '' }, t('sell.cityPlaceholder')),
      state.cities.map((city) =>
        h('option', { value: city.id, selected: city.id === defaultCityId }, cityLabel(city)),
      ),
    ),
  );

  const areaInput = input(
    'area',
    h('input', {
      class: 'field__input',
      id: 'sell-area',
      name: 'area',
      type: 'text',
      maxlength: '60',
      value: initial.area || '',
      placeholder: t('sell.areaPlaceholder'),
      autocomplete: 'address-level3',
      'aria-describedby': 'sell-area-error',
      onInput: scheduleDraft,
    }),
  );

  const descriptionInput = input(
    'description',
    h('textarea', {
      class: 'field__textarea',
      id: 'sell-description',
      name: 'description',
      maxlength: '2000',
      rows: '5',
      placeholder: t('sell.descriptionPlaceholder'),
      'aria-describedby': 'sell-description-error',
      onInput: scheduleDraft,
    }),
  );
  descriptionInput.value = initial.description || '';

  const submitButton = h(
    'button',
    { class: 'btn btn--primary', type: 'submit' },
    editing ? t('sell.saveChanges') : t('sell.publish'),
  );

  const form = h(
    'form',
    {
      class: 'form',
      noValidate: true,
      onSubmit: async (event) => {
        event.preventDefault();
        if (saving) return;
        clearAllErrors();

        const values = {
          title: titleInput.value.trim(),
          price: parsePriceInput(priceInput.value),
          isNegotiable: negotiableInput.checked,
          categoryId: categorySelect.value,
          condition: conditionSelect.value,
          cityId: citySelect.value,
          area: areaInput.value.trim(),
          description: descriptionInput.value.trim(),
        };

        let invalid = false;
        if (!photos.length) {
          photoError.replaceChildren(
            icon('alert-circle', { size: 15 }),
            h('span', {}, t('sell.photoRequired')),
          );
          photoError.hidden = false;
          invalid = true;
        }

        const result = validateListing(values);
        if (!result.ok) {
          for (const [name, key] of Object.entries(result.errors)) {
            showError(name, key);
            invalid = true;
          }
        }
        if (invalid) {
          const firstInvalid = document.querySelector('[aria-invalid="true"]');
          (firstInvalid || photoGrid).focus({ preventScroll: false });
          return;
        }

        saving = true;
        submitButton.disabled = true;
        submitButton.textContent = editing ? t('sell.savingChanges') : t('sell.publishing');

        try {
          const saved = editing
            ? await api.listings.update(existing.id, { ...values, photos })
            : await api.listings.create({ ...values, photos });
          if (!editing) clearSellDraft();
          toast.success(t(editing ? 'sell.updateSuccess' : 'sell.success'));
          navigate(listingPath(saved));
        } catch (error) {
          toast.error(errorMessage(error, editing ? 'sell.updateError' : 'sell.publishError'));
          saving = false;
          submitButton.disabled = false;
          submitButton.textContent = editing ? t('sell.saveChanges') : t('sell.publish');
        }
      },
    },
    h(
      'section',
      { class: 'sell-card' },
      h(
        'div',
        { class: 'form-section' },
        h('h2', { class: 'form-section__title' }, t('sell.photos')),
        h('p', { class: 'form-section__hint' }, t('sell.photosHint')),
        h('div', { class: 'photo-field' }, photoGrid, photoError),
        h('p', { class: 'text-xs text-muted' }, t('sell.photoLimit')),
      ),
    ),
    h(
      'section',
      { class: 'sell-card' },
      h(
        'div',
        { class: 'form-section' },
        h('h2', { class: 'form-section__title' }, t('sell.details')),
        h(
          'div',
          { class: 'field' },
          h('label', { class: 'field__label', for: 'sell-title' }, t('sell.titleLabel')),
          titleInput,
          h('p', { class: 'field__hint' }, t('sell.titleHint')),
          fieldError('title'),
        ),
        h(
          'div',
          { class: 'field' },
          h('label', { class: 'field__label', for: 'sell-price' }, t('sell.priceLabel')),
          h(
            'div',
            { class: 'field__prefix-wrap' },
            h('span', { class: 'field__prefix' }, '₹'),
            priceInput,
          ),
          h('p', { class: 'field__hint' }, t('sell.priceHint')),
          fieldError('price'),
        ),
        h('label', { class: 'checkbox' }, negotiableInput, h('span', {}, t('sell.negotiable'))),
        h(
          'div',
          { class: 'field' },
          h('label', { class: 'field__label', for: 'sell-category' }, t('sell.categoryLabel')),
          categorySelect,
          fieldError('categoryId'),
        ),
        h(
          'div',
          { class: 'field' },
          h('label', { class: 'field__label', for: 'sell-condition' }, t('sell.conditionLabel')),
          conditionSelect,
          fieldError('condition'),
        ),
      ),
    ),
    h(
      'section',
      { class: 'sell-card' },
      h(
        'div',
        { class: 'form-section' },
        h('h2', { class: 'form-section__title' }, t('listing.city')),
        h(
          'div',
          { class: 'field__row' },
          h(
            'div',
            { class: 'field' },
            h('label', { class: 'field__label', for: 'sell-city' }, t('sell.cityLabel')),
            citySelect,
            fieldError('cityId'),
          ),
          h(
            'div',
            { class: 'field' },
            h('label', { class: 'field__label', for: 'sell-area' }, t('sell.areaLabel')),
            areaInput,
            h('p', { class: 'field__hint' }, t('sell.areaHint')),
            fieldError('area'),
          ),
        ),
        h(
          'div',
          { class: 'field' },
          h(
            'label',
            { class: 'field__label', for: 'sell-description' },
            t('sell.descriptionLabel'),
          ),
          descriptionInput,
          fieldError('description'),
        ),
        h(
          'p',
          { class: 'sell-note' },
          icon('shield-check', { size: 16 }),
          h('span', {}, t('sell.draftNote')),
        ),
      ),
    ),
    h(
      'div',
      { class: 'form-footer' },
      h(
        'div',
        { class: 'form__actions' },
        h(
          'a',
          { class: 'btn btn--secondary', href: editing ? `/l/${existing.id}` : '/' },
          t('common.cancel'),
        ),
        submitButton,
      ),
    ),
  );

  renderPhotos();

  return h(
    'div',
    { class: 'container page' },
    h(
      'div',
      { class: 'sell-page' },
      h(
        'div',
        { class: 'sell-intro' },
        h('h1', { class: 'page-title' }, title),
        h('p', { class: 'text-muted', style: { marginTop: '4px' } }, t('sell.subtitle')),
      ),
      form,
    ),
  );
}

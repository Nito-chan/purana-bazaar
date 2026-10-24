import { api } from '../api/index.js';
import { h } from '../lib/dom.js';
import { formatRelativeTime } from '../lib/format.js';
import { currentPath } from '../lib/url.js';
import { t } from '../i18n/index.js';
import { navigate } from '../lib/navigation.js';
import { setPageTitle } from '../lib/seo.js';
import { store } from '../store.js';
import { authRequiredState, errorState } from '../ui/auth-gate.js';
import { confirmSheet } from '../ui/confirm-sheet.js';
import { openSheet } from '../ui/sheet.js';
import { icon } from '../ui/icons.js';
import { toast } from '../ui/toast.js';

export async function render() {
  document.body.dataset.page = 'accountDelete';
  setPageTitle(t('accountDelete.title'));

  const state = store.getState();
  if (state.auth.status !== 'signedIn') {
    return h(
      'div',
      { class: 'container page' },
      h('h1', { class: 'page-title' }, t('accountDelete.title')),
      h('div', { style: { marginTop: '16px' } }, authRequiredState({ next: currentPath() })),
    );
  }

  let requests;
  try {
    requests = await api.accountDeletionRequests.list();
  } catch {
    return h(
      'div',
      { class: 'container page' },
      h('h1', { class: 'page-title' }, t('accountDelete.title')),
      h('div', { style: { marginTop: '16px' } }, errorState({ onRetry: () => navigate('/account/delete') })),
    );
  }

  let pending = requests.find((item) => item.status === 'pending');

  async function createRequest() {
    const reasonInput = h('textarea', {
      class: 'field__textarea',
      id: 'delete-reason',
      placeholder: t('accountDelete.reasonPlaceholder'),
      'aria-label': t('accountDelete.reasonLabel'),
      rows: '4',
      maxlength: '500',
    });
    const errorBox = h('div', { role: 'alert' });

    const form = h(
      'form',
      {
        class: 'form',
        onSubmit: async (event) => {
          event.preventDefault();
          errorBox.replaceChildren();
          const reason = String(reasonInput.value ?? '').trim().slice(0, 500);
          if (!reason) {
            errorBox.appendChild(
              h(
                'p',
                { class: 'field__error' },
                icon('alert-circle', { size: 16 }),
                h('span', {}, t('accountDelete.reasonRequired')),
              ),
            );
            reasonInput.focus();
            return;
          }
          let submitButton;
          try {
            submitButton = form.querySelector('button[type=submit]');
            submitButton.disabled = true;
            submitButton.textContent = t('accountDelete.submitting');
            await api.accountDeletionRequests.create({ reason });
            toast.success(t('accountDelete.requestCreated'));
            handle.close();
            await refreshData();
          } catch {
            toast.error(t('common.genericError'));
          } finally {
            submitButton.disabled = false;
            submitButton.textContent = t('accountDelete.requestDeletion');
          }
        },
      },
      h(
        'div',
        { class: 'field' },
        h(
          'label',
          { class: 'field__label', for: 'delete-reason' },
          t('accountDelete.reasonLabel'),
        ),
        reasonInput,
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
        h('button', { class: 'btn btn--primary', type: 'submit' }, t('accountDelete.requestDeletion')),
      ),
    );

    const handle = openSheet({
      title: t('accountDelete.requestTitle'),
      content: form,
    });
  }

  async function cancelRequest(id) {
    const confirmed = await confirmSheet({
      title: t('accountDelete.cancelTitle'),
      body: t('accountDelete.cancelBody'),
      confirmLabel: t('accountDelete.cancel'),
      danger: true,
    });
    if (!confirmed) return;
    try {
      await api.accountDeletionRequests.cancel(id);
      toast.success(t('accountDelete.requestCancelled'));
      await refreshData();
    } catch {
      toast.error(t('common.genericError'));
    }
  }

  async function refreshData() {
    try {
      requests = await api.accountDeletionRequests.list();
      pending = requests.find((item) => item.status === 'pending');
      renderList();
    } catch {
      toast.error(t('common.genericError'));
    }
  }

  const listHost = h('div', { id: 'account-delete-list' });

  function renderList() {
    listHost.replaceChildren();

    if (pending) {
      listHost.replaceChildren(
        h(
          'div',
          { class: 'account-delete__pending' },
          h('h3', { class: 'account-delete__pending-title' }, t('accountDelete.pendingTitle')),
          h('p', { class: 'account-delete__pending-body' }, t('accountDelete.pendingBody')),
          h(
            'p',
            { class: 'account-delete__pending-reason' },
            h('strong', t('accountDelete.reason') + ': '),
            pending.reason || t('accountDelete.noReason'),
          ),
          h(
            'p',
            { class: 'account-delete__pending-date' },
            h('strong', t('accountDelete.requestedAt') + ': '),
            formatRelativeTime(pending.requestedAt, state.language),
          ),
          h(
            'button',
            {
              class: 'btn btn--danger',
              type: 'button',
              onClick: () => cancelRequest(pending.id),
            },
            icon('trash-2', { size: 18 }),
            t('accountDelete.cancel'),
          ),
        ),
      );
    } else {
      listHost.replaceChildren(
        h(
          'div',
          { class: 'account-delete__create' },
          h('h3', { class: 'account-delete__create-title' }, t('accountDelete.createTitle')),
          h('p', { class: 'account-delete__create-body' }, t('accountDelete.createBody')),
          h(
            'button',
            {
              class: 'btn btn--primary',
              type: 'button',
              onClick: () => createRequest(),
            },
            icon('user', { size: 18 }),
            t('accountDelete.requestDeletion'),
          ),
        ),
      );
    }
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
        h('h1', { class: 'page-title' }, t('accountDelete.title')),
        h('p', { class: 'text-muted' }, t('accountDelete.subtitle')),
      ),
    ),
    h('div', { style: { marginTop: '20px' } }, listHost),
  );
}

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/pages.css';

import { api } from './api/index.js';
import { h } from './lib/dom.js';
import { i18nReady, setLanguage, t } from './i18n/index.js';
import { syncSession } from './lib/session.js';
import { initNativeBackButton } from './lib/native.js';
import { store } from './store.js';
import { startRouter } from './router.js';
import { createShell } from './ui/shell.js';
import { toast } from './ui/toast.js';

const app = document.getElementById('app');

function bootError(message) {
  app.replaceChildren(
    h(
      'main',
      { class: 'container page', id: 'main' },
      h('div', { class: 'avatar' }, h('span', {}, 'PB')),
      h('h1', { class: 'page-title' }, t('common.error')),
      h('p', { class: 'text-muted', style: { marginTop: '8px' } }, message),
      h(
        'button',
        {
          class: 'btn btn--primary',
          type: 'button',
          style: { marginTop: '16px' },
          onClick: () => window.location.reload(),
        },
        t('common.retry'),
      ),
    ),
  );
}

async function boot() {
  const state = store.getState();
  setLanguage(state.language);

  try {
    await i18nReady;

    app.replaceChildren(
      h(
        'div',
        { class: 'container page', role: 'status' },
        h('p', { class: 'text-muted' }, t('common.loading')),
      ),
    );

    const [categories, cities] = await Promise.all([
      api.categories.list(),
      api.cities.list(),
      syncSession(),
    ]);
    store.setState({ categories, cities, ready: true });

    const shell = createShell();
    app.replaceChildren(shell.element);
    startRouter({ root: shell.view, announcerElement: shell.announcer });
    initNativeBackButton().catch((error) => {
      console.warn('Native back handling unavailable', error);
    });

    window.addEventListener('offline', () => {
      store.setState({ online: false });
      toast.error(t('errors.offline'));
    });
    window.addEventListener('online', () => {
      store.setState({ online: true });
      toast.success(t('common.online'));
    });
  } catch (error) {
    console.error(error);
    bootError(t('errors.loadFailed'));
  }
}

boot();

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration is optional; the app works without it.
    });
  });
}

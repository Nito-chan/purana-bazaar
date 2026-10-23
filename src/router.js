import { h } from './lib/dom.js';
import { runCleanups } from './lib/lifecycle.js';
import { setNavigationHandler, setRefreshHandler } from './lib/navigation.js';
import { setPageTitle } from './lib/seo.js';
import { store } from './store.js';
import { errorState } from './ui/auth-gate.js';

const routes = [
  { name: 'home', pattern: /^\/$/, load: () => import('./pages/home.js') },
  {
    name: 'listing',
    pattern: /^\/l\/([^/]+)\/?$/,
    keys: ['id'],
    load: () => import('./pages/listing.js'),
  },
  { name: 'sell', pattern: /^\/sell\/?$/, load: () => import('./pages/sell.js') },
  {
    name: 'editListing',
    pattern: /^\/sell\/([^/]+)\/?$/,
    keys: ['id'],
    load: () => import('./pages/sell.js'),
  },
  { name: 'login', pattern: /^\/login\/?$/, load: () => import('./pages/auth.js') },
  { name: 'signup', pattern: /^\/signup\/?$/, load: () => import('./pages/auth.js') },
  { name: 'forgot', pattern: /^\/forgot\/?$/, load: () => import('./pages/auth.js') },
  { name: 'profile', pattern: /^\/me\/?$/, load: () => import('./pages/profile.js') },
  {
    name: 'myListings',
    pattern: /^\/me\/listings\/?$/,
    load: () => import('./pages/my-listings.js'),
  },
  {
    name: 'myListingsAlias',
    pattern: /^\/my-listings\/?$/,
    load: () => import('./pages/my-listings.js'),
  },
  { name: 'saved', pattern: /^\/saved\/?$/, load: () => import('./pages/saved.js') },
  {
    name: 'savedSearches',
    pattern: /^\/saved-searches\/?$/,
    load: () => import('./pages/saved-searches.js'),
  },
  { name: 'chats', pattern: /^\/chats\/?$/, load: () => import('./pages/chats.js') },
  {
    name: 'chat',
    pattern: /^\/chat\/([^/]+)\/?$/,
    keys: ['id'],
    load: () => import('./pages/chat.js'),
  },
  {
    name: 'notifications',
    pattern: /^\/notifications\/?$/,
    load: () => import('./pages/notifications.js'),
  },
  {
    name: 'seller',
    pattern: /^\/u\/([^/]+)\/?$/,
    keys: ['id'],
    load: () => import('./pages/seller.js'),
  },
  {
    name: 'admin',
    pattern: /^\/admin\/?$/,
    load: () => import('./pages/info.js'),
    variant: 'admin',
  },
  {
    name: 'wanted',
    pattern: /^\/wanted\/?$/,
    load: () => import('./pages/wanted.js'),
  },
  {
    name: 'landing',
    pattern: /^\/([^/]+)\/([^/]+)\/?$/,
    keys: ['city', 'category'],
    load: () => import('./pages/landing.js'),
  },
  { name: 'notFound', pattern: /.*/, load: () => import('./pages/not-found.js') },
];

let viewRoot = null;
let announcer = null;
let renderSequence = 0;
let initialRender = true;

function parseLocation() {
  const pathname = window.location.pathname || '/';
  for (const route of routes) {
    const match = route.pattern.exec(pathname);
    if (!match) continue;
    const params = {};
    (route.keys || []).forEach((key, index) => {
      params[key] = decodeURIComponent(match[index + 1] || '');
    });
    return {
      route,
      params,
      query: Object.fromEntries(new URLSearchParams(window.location.search)),
      path: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    };
  }
  return {
    route: routes[routes.length - 1],
    params: {},
    query: Object.fromEntries(new URLSearchParams(window.location.search)),
    path: `${window.location.pathname}${window.location.search}`,
  };
}

function showLoadingBar() {
  const bar = h('div', { class: 'loading-bar', role: 'presentation' });
  document.body.appendChild(bar);
  return () => bar.remove();
}

async function renderRoute({ focus = true } = {}) {
  if (!viewRoot) return;
  const sequence = ++renderSequence;
  const location = parseLocation();
  const { route } = location;

  runCleanups();
  document.body.dataset.page = route.name;
  store.setState({ route: route.name });
  setPageTitle('');

  let removeLoading = null;
  const loadingTimer = window.setTimeout(() => {
    removeLoading = showLoadingBar();
  }, 180);

  try {
    const module = await route.load();
    if (sequence !== renderSequence) return;
    const node = await module.render({
      ...location,
      variant: route.variant || null,
    });
    if (sequence !== renderSequence) return;

    viewRoot.replaceChildren(node);
    if (announcer) announcer.textContent = document.title;
    if (focus && !initialRender) {
      const main = document.getElementById('main');
      main?.focus({ preventScroll: true });
    }
    initialRender = false;
    if (!window.location.hash) window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  } catch (error) {
    console.error(error);
    if (sequence !== renderSequence) return;
    setPageTitle('Something went wrong');
    viewRoot.replaceChildren(
      h(
        'div',
        { class: 'container page' },
        errorState({
          body: 'We could not load this page. Please check your connection and try again.',
          onRetry: () => refresh(),
        }),
      ),
    );
  } finally {
    window.clearTimeout(loadingTimer);
    removeLoading?.();
  }
}

export function navigate(path, options = {}) {
  let url;
  try {
    url = new URL(path, window.location.origin);
  } catch {
    return;
  }
  if (url.origin !== window.location.origin) return;

  const target = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (target === current) {
    if (url.hash) {
      document.querySelector(url.hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    return;
  }

  window.history[options.replace ? 'replaceState' : 'pushState'](
    { ...(window.history.state || {}), pb: true },
    '',
    target,
  );
  renderRoute();
}

export function refresh() {
  renderRoute({ focus: false });
}

export function startRouter({ root, announcerElement }) {
  viewRoot = root;
  announcer = announcerElement;

  setNavigationHandler(navigate);
  setRefreshHandler(refresh);

  window.addEventListener('popstate', () => {
    renderRoute({ focus: false });
  });

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!anchor) return;
    if (anchor.target && anchor.target !== '_self') return;
    if (anchor.hasAttribute('download')) return;
    if (anchor.dataset.router === 'ignore') return;

    const raw = anchor.getAttribute('href');
    if (!raw || raw.startsWith('#')) return;

    let url;
    try {
      url = new URL(anchor.href, window.location.origin);
    } catch {
      return;
    }
    if (url.origin !== window.location.origin) return;
    if (!/^https?:$/.test(url.protocol)) return;

    event.preventDefault();
    navigate(`${url.pathname}${url.search}${url.hash}`);
  });

  renderRoute({ focus: false });
}

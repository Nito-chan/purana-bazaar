import { config } from '../config.js';
import { h } from '../lib/dom.js';
import { applyLanguage } from '../lib/preferences.js';
import { cityLabel, getLanguage, t } from '../i18n/index.js';
import { store } from '../store.js';
import { openCitySheet } from './city-sheet.js';
import { avatar } from './avatar.js';
import { icon } from './icons.js';

function badgeCount(value) {
  const count = Number(value) || 0;
  if (!count) return null;
  return count > 9 ? '9+' : String(count);
}

function headerCityChip(extraClass = '') {
  const state = store.getState();
  const city = state.cities.find((item) => item.id === state.cityId) || null;
  const label = city ? cityLabel(city) : t('home.allCities');
  return h(
    'button',
    {
      class: `city-chip ${extraClass}`.trim(),
      type: 'button',
      'aria-label': `${t('header.chooseCity')}: ${label}`,
      onClick: openCitySheet,
    },
    icon('map-pin', { size: 17, className: 'city-chip__icon' }),
    h('span', { class: 'nowrap' }, label),
    icon('chevron-down', { size: 15, className: 'city-chip__caret' }),
  );
}

function languageButton() {
  const language = getLanguage();
  const label = language === 'en' ? 'हिंदी' : 'English';
  return h(
    'button',
    {
      class: 'btn btn--ghost btn--sm',
      type: 'button',
      'aria-label': `${t('profile.language')}: ${label}`,
      onClick: () => applyLanguage(language === 'en' ? 'hi' : 'en'),
    },
    icon('globe', { size: 17 }),
    h('span', {}, language === 'en' ? 'हिंदी' : 'English'),
  );
}

export function renderHeader(header) {
  const state = store.getState();
  const route = state.route;
  const signedIn = state.auth.status === 'signedIn';
  const user = state.auth.user;
  const unread = badgeCount(state.unreadNotifications);

  const navLink = (href, key, active) =>
    h(
      'a',
      {
        class: `header-nav__link${active ? ' is-active' : ''}`,
        href,
        'aria-current': active ? 'page' : null,
      },
      t(key),
    );

  const notificationLink = h(
    'a',
    {
      class: 'icon-btn',
      href: '/notifications',
      'aria-label': t('header.notifications'),
    },
    icon('bell', { size: 21 }),
    unread ? h('span', { class: 'icon-btn__badge', 'aria-hidden': 'true' }, unread) : null,
  );

  header.replaceChildren(
    h(
      'div',
      { class: 'container site-header__bar' },
      h(
        'a',
        { class: 'brand', href: '/' },
        h('img', {
          class: 'brand__mark',
          src: '/favicon.svg',
          alt: '',
          width: 32,
          height: 32,
        }),
        h('span', { class: 'brand__name' }, t('common.appName')),
        config.useMock
          ? h('span', { class: 'demo-pill desktop-only', 'aria-hidden': 'true' }, t('header.demo'))
          : null,
      ),
      h(
        'nav',
        { class: 'header-nav', 'aria-label': t('nav.primary') },
        navLink('/', 'nav.home', route === 'home' || route === 'landing'),
        navLink('/saved', 'nav.saved', route === 'saved'),
        navLink('/wanted', 'nav.wanted', route === 'wanted'),
        navLink('/chats', 'nav.chats', route === 'chats' || route === 'chat'),
        h(
          'a',
          {
            class: `btn btn--accent btn--sm header-nav__sell${route === 'sell' || route === 'editListing' ? ' is-active' : ''}`,
            href: '/sell',
          },
          icon('plus', { size: 17 }),
          t('nav.sell'),
        ),
      ),
      h(
        'div',
        { class: 'header-actions' },
        h('div', { class: 'desktop-only' }, headerCityChip()),
        h('div', { class: 'desktop-only' }, languageButton()),
        notificationLink,
        h(
          'a',
          {
            class: 'icon-btn',
            href: '/me',
            'aria-label': signedIn ? t('nav.profile') : t('common.signIn'),
          },
          signedIn ? avatar({ name: user?.name || '', size: 'sm' }) : icon('user', { size: 21 }),
        ),
      ),
    ),
    h(
      'div',
      { class: 'container site-header__sub' },
      headerCityChip(),
      h('span', { class: 'header-tagline' }, t('header.tagline')),
      languageButton(),
    ),
  );
}

export function renderBottomNav(nav) {
  const state = store.getState();
  const route = state.route;
  const unread = badgeCount(state.unreadChats);

  const link = (href, key, iconName, active, extraClass = '') =>
    h(
      'a',
      {
        class: `bottom-nav__link ${extraClass}${active ? ' is-active' : ''}`.trim(),
        href,
        'aria-current': active ? 'page' : null,
      },
      h('span', { class: 'bottom-nav__icon' }, icon(iconName, { size: 23 })),
      h('span', {}, t(key)),
    );

  nav.replaceChildren(
    link('/', 'nav.home', 'home', route === 'home' || route === 'landing'),
    link('/saved', 'nav.saved', 'heart', route === 'saved'),
    h(
      'a',
      {
        class: `bottom-nav__link bottom-nav__link--sell${route === 'sell' || route === 'editListing' ? ' is-active' : ''}`,
        href: '/sell',
      },
      h('span', { class: 'bottom-nav__sell' }, icon('plus', { size: 24 })),
      h('span', {}, t('nav.sell')),
    ),
    h(
      'a',
      {
        class: `bottom-nav__link${route === 'chats' || route === 'chat' ? ' is-active' : ''}`,
        href: '/chats',
        'aria-current': route === 'chats' || route === 'chat' ? 'page' : null,
      },
      h('span', { class: 'bottom-nav__icon' }, icon('message-circle', { size: 23 })),
      h('span', {}, t('nav.chats')),
      unread ? h('span', { class: 'bottom-nav__badge', 'aria-hidden': 'true' }, unread) : null,
    ),
    link(
      '/me',
      'nav.profile',
      'user',
      ['profile', 'myListings', 'myListingsAlias', 'notifications', 'seller'].includes(route),
    ),
  );
}

export function createFooter() {
  return h(
    'footer',
    { class: 'site-footer' },
    h(
      'div',
      { class: 'container site-footer__inner' },
      h(
        'div',
        {},
        h('p', { class: 'strong' }, t('footer.tagline')),
        h('p', { class: 'text-xs text-muted' }, t('footer.madeFor')),
        h(
          'nav',
          { class: 'site-footer__links', 'aria-label': t('footer.legalNav') },
          h('a', { href: '/terms' }, t('footer.terms')),
          h('a', { href: '/privacy' }, t('footer.privacy')),
          config.useMock ? h('a', { href: '/credits' }, t('footer.credits')) : null,
        ),
      ),
      config.useMock ? h('p', { class: 'text-xs text-muted' }, t('footer.demo')) : null,
      h(
        'p',
        { class: 'text-xs text-muted' },
        t('footer.rights', { year: new Date().getFullYear() }),
      ),
    ),
  );
}

export function createShell() {
  const header = h('header', { class: 'site-header' });
  const main = h(
    'main',
    { id: 'main', tabIndex: -1 },
    h('div', { id: 'view' }),
    h('div', { class: 'route-announcer sr-only', 'aria-live': 'polite', 'aria-atomic': 'true' }),
  );
  const bottomNav = h('nav', { class: 'bottom-nav', 'aria-label': t('nav.primary') });
  const footer = createFooter();

  renderHeader(header);
  renderBottomNav(bottomNav);

  const unsubscribe = store.subscribe(() => {
    renderHeader(header);
    renderBottomNav(bottomNav);
  });

  return {
    element: h('div', { class: 'app-shell' }, header, main, footer, bottomNav),
    header,
    main,
    view: main.querySelector('#view'),
    announcer: main.querySelector('.route-announcer'),
    bottomNav,
    unsubscribe,
  };
}

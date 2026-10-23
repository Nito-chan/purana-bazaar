import { api } from '../api/index.js';
import { config } from '../config.js';
import { h } from '../lib/dom.js';
import { formatDate, formatPhone } from '../lib/format.js';
import { cityLabel, t } from '../i18n/index.js';
import { isSignedIn } from '../lib/auth.js';
import { currentPath } from '../lib/url.js';
import { navigate } from '../lib/navigation.js';
import { applyLanguage } from '../lib/preferences.js';
import { setPageTitle } from '../lib/seo.js';
import { setSignedOut } from '../lib/session.js';
import { cityById, store } from '../store.js';
import { authRequiredState, errorState } from '../ui/auth-gate.js';
import { avatar } from '../ui/avatar.js';
import { confirmSheet } from '../ui/confirm-sheet.js';
import { openCitySheet } from '../ui/city-sheet.js';
import { icon } from '../ui/icons.js';
import { toast } from '../ui/toast.js';

function menuRow({ href, iconName, title, meta, onClick, danger = false }) {
  const children = [
    h('span', { class: 'menu-row__icon' }, icon(iconName, { size: 19 })),
    h(
      'span',
      { class: 'menu-row__body' },
      h('span', { class: 'menu-row__title' }, title),
      meta ? h('span', { class: 'menu-row__meta' }, meta) : null,
    ),
    h('span', { class: 'menu-row__chevron' }, icon('chevron-right', { size: 18 })),
  ];
  const className = `menu-row${danger ? ' menu-row--danger' : ''}`;
  return href
    ? h('a', { class: className, href }, children)
    : h('button', { class: className, type: 'button', onClick }, children);
}

export async function render() {
  document.body.dataset.page = 'profile';
  setPageTitle(t('profile.title'));

  if (!isSignedIn()) {
    return h(
      'div',
      { class: 'container page' },
      h('h1', { class: 'page-title' }, t('profile.title')),
      h('div', { style: { marginTop: '16px' } }, authRequiredState({ next: currentPath() })),
    );
  }

  let listings;
  let saved;
  try {
    [listings, saved] = await Promise.all([api.listings.my(), api.favourites.list()]);
  } catch {
    return h('div', { class: 'container page' }, errorState({ onRetry: () => navigate('/me') }));
  }

  const state = store.getState();
  const user = state.auth.user;
  const language = state.language;
  const city = cityById(state.cities, state.cityId);
  const active = listings.filter((listing) => listing.status === 'active').length;
  const sold = listings.filter((listing) => listing.status === 'sold').length;
  const savedCount = saved.length;

  const head = h(
    'section',
    { class: 'profile-head' },
    avatar({ name: user.name, size: 'xl', verified: user.isVerified }),
    h(
      'div',
      { class: 'profile-head__body' },
      h('h1', { class: 'profile-name' }, user.name),
      h('p', { class: 'profile-meta' }, user.email || ''),
      h(
        'p',
        { class: 'profile-meta' },
        user.phone ? formatPhone(user.phone) : '',
        user.phone && city ? ' · ' : '',
        city ? cityLabel(city) : '',
      ),
      h(
        'p',
        { class: 'profile-meta' },
        t('profile.memberSince', { date: formatDate(user.memberSince, language) }),
      ),
    ),
  );

  const stats = h(
    'div',
    { class: 'profile-stats' },
    h(
      'div',
      { class: 'profile-stat' },
      h('div', { class: 'profile-stat__value' }, String(active)),
      h('div', { class: 'profile-stat__label' }, t('profile.statsListings')),
    ),
    h(
      'div',
      { class: 'profile-stat' },
      h('div', { class: 'profile-stat__value' }, String(sold)),
      h('div', { class: 'profile-stat__label' }, t('profile.statsSold')),
    ),
    h(
      'div',
      { class: 'profile-stat' },
      h('div', { class: 'profile-stat__value' }, String(savedCount)),
      h('div', { class: 'profile-stat__label' }, t('profile.statsSaved')),
    ),
  );

  const menu = h(
    'nav',
    { class: 'menu-card', 'aria-label': t('profile.account') },
    menuRow({
      href: '/my-listings',
      iconName: 'list',
      title: t('profile.myListings'),
      meta: t('profile.statsListings'),
    }),
    menuRow({
      href: '/saved',
      iconName: 'heart',
      title: t('profile.saved'),
      meta: t('common.item', { count: savedCount }),
    }),
    menuRow({
      href: '/saved-searches',
      iconName: 'list',
      title: t('profile.savedSearches'),
    }),
    menuRow({
      href: '/notifications',
      iconName: 'bell',
      title: t('profile.notifications'),
      meta: state.unreadNotifications
        ? t('chats.unread', { count: state.unreadNotifications })
        : '',
    }),
    menuRow({
      iconName: 'globe',
      title: t('profile.language'),
      meta: language === 'en' ? 'English' : 'हिंदी',
      onClick: () => applyLanguage(language === 'en' ? 'hi' : 'en'),
    }),
    menuRow({
      iconName: 'map-pin',
      title: t('profile.city'),
      meta: city ? cityLabel(city) : t('home.allCities'),
      onClick: openCitySheet,
    }),
    user.isAdmin
      ? menuRow({
          href: '/admin',
          iconName: 'shield-check',
          title: t('profile.admin'),
        })
      : null,
    menuRow({
      iconName: 'log-out',
      title: t('profile.signOut'),
      onClick: async () => {
        const confirmed = await confirmSheet({
          title: t('profile.signOutTitle'),
          body: t('profile.signOutBody'),
          confirmLabel: t('profile.signOut'),
          danger: true,
        });
        if (!confirmed) return;
        try {
          await api.auth.logout();
          setSignedOut();
          toast.success(t('profile.signedOut'));
          navigate('/');
        } catch {
          toast.error(t('common.genericError'));
        }
      },
      danger: true,
    }),
  );

  return h(
    'div',
    { class: 'container page' },
    head,
    h(
      'div',
      { class: 'profile-actions' },
      h(
        'a',
        { class: 'btn btn--primary', href: '/sell' },
        icon('plus', { size: 18 }),
        t('nav.sell'),
      ),
      h(
        'a',
        { class: 'btn btn--secondary', href: '/my-listings' },
        icon('list', { size: 18 }),
        t('profile.myListings'),
      ),
    ),
    stats,
    menu,
    config.useMock ? h('p', { class: 'auth-note' }, t('profile.demoNote')) : null,
  );
}

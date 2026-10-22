import { h } from '../lib/dom.js';
import { t } from '../i18n/index.js';
import { setPageTitle } from '../lib/seo.js';
import { store } from '../store.js';
import { icon } from '../ui/icons.js';

export function render({ variant = 'wanted' }) {
  document.body.dataset.page = 'info';
  const isAdminArea = variant === 'admin';
  const user = store.getState().auth.user;
  const allowed = !isAdminArea || Boolean(user?.isAdmin);

  const title = isAdminArea
    ? allowed
      ? t('admin.title')
      : t('profile.adminOnly')
    : t('wanted.title');
  const body = isAdminArea ? (allowed ? t('admin.body') : t('admin.notAllowed')) : t('wanted.body');
  setPageTitle(title);

  return h(
    'div',
    { class: 'container page' },
    h(
      'div',
      { class: 'placeholder-page' },
      h(
        'div',
        { class: 'placeholder-card' },
        h(
          'div',
          { class: 'placeholder-card__icon' },
          icon(allowed ? 'sparkles' : 'lock', { size: 30 }),
        ),
        h('h1', { class: 'placeholder-card__title' }, title),
        h('p', { class: 'placeholder-card__body' }, body),
        h(
          'div',
          { class: 'placeholder-card__actions' },
          h(
            'a',
            { class: 'btn btn--primary', href: '/' },
            icon('home', { size: 18 }),
            t('notFound.browse'),
          ),
          allowed && !isAdminArea
            ? h(
                'a',
                { class: 'btn btn--secondary', href: '/sell' },
                icon('plus', { size: 18 }),
                t('nav.sell'),
              )
            : null,
        ),
      ),
    ),
  );
}

import { h } from '../lib/dom.js';
import { t } from '../i18n/index.js';
import { loginPath } from '../lib/auth.js';
import { currentPath } from '../lib/url.js';
import { emptyState } from './empty.js';

export function authRequiredState({ title, body, next = currentPath() } = {}) {
  return emptyState({
    iconName: 'lock',
    title: title || t('profile.signedOutTitle'),
    body: body || t('profile.signedOutBody'),
    actions: [
      {
        label: t('profile.signInAction'),
        href: loginPath(next),
        variant: 'primary',
      },
      {
        label: t('saved.browse'),
        href: '/',
        variant: 'secondary',
      },
    ],
  });
}

export function errorState({
  title = t('common.error'),
  body = t('common.genericError'),
  onRetry,
} = {}) {
  return emptyState({
    iconName: 'alert-circle',
    title,
    body,
    actions: onRetry
      ? [{ label: t('common.retry'), onClick: onRetry, variant: 'primary' }]
      : [{ label: t('notFound.home'), href: '/', variant: 'primary' }],
  });
}

export function loadingPage(label = t('common.loading')) {
  return h('div', { class: 'page' }, h('p', { class: 'text-muted', role: 'status' }, label));
}

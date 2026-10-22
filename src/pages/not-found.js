import { h } from '../lib/dom.js';
import { t } from '../i18n/index.js';
import { setPageTitle } from '../lib/seo.js';
import { icon } from '../ui/icons.js';

export function render() {
  document.body.dataset.page = 'notFound';
  setPageTitle(t('notFound.title'));

  return h(
    'div',
    { class: 'container page' },
    h(
      'div',
      { class: 'not-found' },
      h('p', { class: 'not-found__code', 'aria-hidden': 'true' }, t('notFound.code')),
      h('h1', { class: 'not-found__title' }, t('notFound.title')),
      h('p', { class: 'not-found__body' }, t('notFound.body')),
      h(
        'div',
        { class: 'not-found__actions' },
        h(
          'a',
          { class: 'btn btn--primary', href: '/' },
          icon('home', { size: 18 }),
          t('notFound.home'),
        ),
        h(
          'a',
          { class: 'btn btn--secondary', href: '/?category=mobiles' },
          icon('search', { size: 18 }),
          t('notFound.browse'),
        ),
      ),
    ),
  );
}

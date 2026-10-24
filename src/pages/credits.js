import { h } from '../lib/dom.js';
import { t } from '../i18n/index.js';
import { setPageTitle } from '../lib/seo.js';
import { icon } from '../ui/icons.js';
import { PHOTO_CREDITS, licenseUrl } from '../lib/photo-credits.js';

function creditItem(credit) {
  const license = licenseUrl(credit.license);
  return h(
    'li',
    { class: 'credit-item' },
    h('p', { class: 'credit-item__title' }, credit.title),
    h(
      'p',
      { class: 'credit-item__meta' },
      h('span', {}, credit.creator),
      license
        ? h(
            'a',
            {
              href: license,
              target: '_blank',
              rel: 'noreferrer',
              'aria-label': `${credit.license}: ${credit.title}`,
            },
            credit.license,
          )
        : h('span', {}, credit.license),
      h(
        'a',
        {
          href: credit.source,
          target: '_blank',
          rel: 'noreferrer',
          'aria-label': `${t('credits.viewSource')}: ${credit.title}`,
        },
        t('credits.viewSource'),
      ),
    ),
  );
}

function creditSection(title, items) {
  return h(
    'section',
    { class: 'credits-section' },
    h('h2', { class: 'credits-section__title' }, title),
    h('ul', { class: 'credits-list' }, items.map(creditItem)),
  );
}

export function render() {
  document.body.dataset.page = 'credits';
  setPageTitle(t('credits.title'));

  const listings = PHOTO_CREDITS.filter((credit) => credit.file.startsWith('listings/'));
  const categories = PHOTO_CREDITS.filter((credit) => credit.file.startsWith('categories/'));

  return h(
    'div',
    { class: 'container page credits-page' },
    h(
      'div',
      { class: 'page-head' },
      h(
        'div',
        {},
        h('h1', { class: 'page-title' }, t('credits.title')),
        h('p', { class: 'page-subtitle' }, t('credits.subtitle')),
      ),
    ),
    h('p', { class: 'credits-note' }, t('credits.note')),
    creditSection(t('credits.listings'), listings),
    creditSection(t('credits.categories'), categories),
    h(
      'div',
      { class: 'legal-actions' },
      h(
        'a',
        { class: 'btn btn--secondary', href: '/' },
        icon('home', { size: 18 }),
        t('credits.back'),
      ),
    ),
  );
}

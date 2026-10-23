import { h } from '../lib/dom.js';
import { t } from '../i18n/index.js';
import { navigate } from '../lib/navigation.js';
import { setPageTitle } from '../lib/seo.js';
import { icon } from '../ui/icons.js';

export async function render() {
  document.body.dataset.page = 'terms';
  setPageTitle(t('terms.title'));

  return h(
    'div',
    { class: 'container page' },
    h(
      'div',
      { class: 'page-head' },
      h(
        'div',
        {},
        h('h1', { class: 'page-title' }, t('terms.title')),
        h('p', { class: 'text-muted' }, t('terms.subtitle')),
      ),
    ),
    h(
      'div',
      { class: 'legal-content', style: { marginTop: '20px', lineHeight: 1.7 } },
      h('h2', { class: 'legal-section__title' }, t('terms.acceptance')),
      h(
        'p',
        {},
        t('terms.acceptanceBody', {
          site: t('common.appName'),
          date: new Date().toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
        }),
      ),
      h('h2', { class: 'legal-section__title' }, t('terms.use')),
      h('p', {}, t('terms.useBody')),
      h('h2', { class: 'legal-section__title' }, t('terms.account')),
      h('p', {}, t('terms.accountBody')),
      h('h2', { class: 'legal-section__title' }, t('terms.posting')),
      h('p', {}, t('terms.postingBody')),
      h('h2', { class: 'legal-section__title' }, t('terms.payments')),
      h('p', {}, t('terms.paymentsBody')),
      h('h2', { class: 'legal-section__title' }, t('terms.moderation')),
      h('p', {}, t('terms.moderationBody')),
      h('h2', { class: 'legal-section__title' }, t('terms.limitation')),
      h('p', {}, t('terms.limitationBody')),
      h('h2', { class: 'legal-section__title' }, t('terms.changes')),
      h('p', {}, t('terms.changesBody')),
      h('h2', { class: 'legal-section__title' }, t('terms.contact')),
      h('p', {}, t('terms.contactBody')),
    ),
    h(
      'div',
      { class: 'legal-actions', style: { marginTop: '28px' } },
      h(
        'a',
        { class: 'btn btn--secondary', href: '/', onClick: () => navigate('/') },
        icon('home', { size: 18 }),
        t('notFound.browse'),
      ),
    ),
  );
}

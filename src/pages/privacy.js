import { h } from '../lib/dom.js';
import { t } from '../i18n/index.js';
import { navigate } from '../lib/navigation.js';
import { setPageTitle } from '../lib/seo.js';
import { icon } from '../ui/icons.js';

export async function render() {
  document.body.dataset.page = 'privacy';
  setPageTitle(t('privacy.title'));

  return h(
    'div',
    { class: 'container page' },
    h(
      'div',
      { class: 'page-head' },
      h(
        'div',
        {},
        h('h1', { class: 'page-title' }, t('privacy.title')),
        h('p', { class: 'text-muted' }, t('privacy.subtitle')),
      ),
    ),
    h(
      'div',
      { class: 'legal-content', style: { marginTop: '20px', lineHeight: 1.7 } },
      h('h2', { class: 'legal-section__title' }, t('privacy.infoWeCollect')),
      h('p', {}, t('privacy.infoWeCollectBody')),
      h('h2', { class: 'legal-section__title' }, t('privacy.howWeUse')),
      h('p', {}, t('privacy.howWeUseBody')),
      h('h2', { class: 'legal-section__title' }, t('privacy.sharing')),
      h('p', {}, t('privacy.sharingBody')),
      h('h2', { class: 'legal-section__title' }, t('privacy.cookies')),
      h('p', {}, t('privacy.cookiesBody')),
      h('h2', { class: 'legal-section__title' }, t('privacy.dataRetention')),
      h('p', {}, t('privacy.dataRetentionBody')),
      h('h2', { class: 'legal-section__title' }, t('privacy.yourRights')),
      h('p', {}, t('privacy.yourRightsBody')),
      h('h2', { class: 'legal-section__title' }, t('privacy.security')),
      h('p', {}, t('privacy.securityBody')),
      h('h2', { class: 'legal-section__title' }, t('privacy.contact')),
      h('p', {}, t('privacy.contactBody')),
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

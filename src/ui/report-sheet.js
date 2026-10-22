import { api } from '../api/index.js';
import { h } from '../lib/dom.js';
import { errorMessage, t } from '../i18n/index.js';
import { validateReport } from '../lib/validation.js';
import { isSignedIn, loginPath } from '../lib/auth.js';
import { currentPath } from '../lib/url.js';
import { navigate } from '../lib/navigation.js';
import { openSheet } from './sheet.js';
import { toast } from './toast.js';
import { icon } from './icons.js';

export function openReportSheet({ listingId = null, userId = null } = {}) {
  if (!isSignedIn()) {
    navigate(loginPath(currentPath()));
    return;
  }

  const reasons = [
    ['fake', 'report.reason.fake'],
    ['wrong', 'report.reason.wrong'],
    ['scam', 'report.reason.scam'],
    ['inappropriate', 'report.reason.inappropriate'],
    ['prohibited', 'report.reason.prohibited'],
    ['other', 'report.reason.other'],
  ];

  const formId = 'report-form';
  const errorBox = h('div', { role: 'alert', 'aria-live': 'assertive' });
  const details = h('textarea', {
    class: 'field__textarea',
    id: 'report-details',
    name: 'details',
    maxlength: '500',
    placeholder: t('report.detailsPlaceholder'),
  });

  const radios = reasons.map(([value, key]) =>
    h(
      'label',
      { class: 'report-reason' },
      h('input', { type: 'radio', name: 'reason', value }),
      h('span', {}, t(key)),
    ),
  );

  const submit = h(
    'button',
    { class: 'btn btn--primary', type: 'submit', form: formId },
    t('report.submit'),
  );

  const form = h(
    'form',
    {
      class: 'form',
      id: formId,
      noValidate: true,
      onSubmit: async (event) => {
        event.preventDefault();
        errorBox.replaceChildren();
        const formData = new FormData(form);
        const values = {
          reason: formData.get('reason'),
          details: formData.get('details'),
        };
        const result = validateReport(values);
        if (!result.ok) {
          errorBox.appendChild(
            h(
              'p',
              { class: 'field__error' },
              icon('alert-circle', { size: 16 }),
              h('span', {}, t(Object.values(result.errors)[0])),
            ),
          );
          return;
        }

        submit.disabled = true;
        submit.textContent = t('report.submitting');
        try {
          await api.reports.create({ ...values, listingId, userId });
          toast.success(t('report.success'));
          handle.close();
        } catch (error) {
          errorBox.replaceChildren(
            h(
              'p',
              { class: 'field__error' },
              icon('alert-circle', { size: 16 }),
              h('span', {}, errorMessage(error, 'report.error')),
            ),
          );
          submit.disabled = false;
          submit.textContent = t('report.submit');
        }
      },
    },
    h('p', { class: 'text-muted text-sm' }, t('report.subtitle')),
    h(
      'fieldset',
      { class: 'report-reasons', style: { border: '0', padding: '0', margin: '0' } },
      h('legend', { class: 'field__label' }, t('report.reasonLabel')),
      radios,
    ),
    h(
      'div',
      { class: 'field' },
      h(
        'label',
        { class: 'field__label', for: 'report-details' },
        h('span', {}, t('report.details')),
        h('span', { class: 'field__optional' }, t('common.optional')),
      ),
      details,
    ),
    errorBox,
  );

  const handle = openSheet({
    title: t('report.title'),
    content: form,
    actions: submit,
  });
}

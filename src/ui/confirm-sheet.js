import { h } from '../lib/dom.js';
import { t } from '../i18n/index.js';
import { openSheet } from './sheet.js';

export function confirmSheet({
  title = t('confirm.title'),
  body = t('confirm.body'),
  confirmLabel = t('confirm.yes'),
  cancelLabel = t('confirm.no'),
  danger = false,
} = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    let handle = null;
    const cancel = h(
      'button',
      {
        class: 'btn btn--secondary',
        type: 'button',
        onClick: () => handle?.close(),
      },
      cancelLabel,
    );
    const confirm = h(
      'button',
      {
        class: `btn ${danger ? 'btn--danger' : 'btn--primary'}`,
        type: 'button',
        onClick: () => {
          finish(true);
          handle?.close();
        },
      },
      confirmLabel,
    );

    handle = openSheet({
      title,
      content: h('p', { class: 'text-muted' }, body),
      actions: [cancel, confirm],
      onClose: () => finish(false),
    });
  });
}

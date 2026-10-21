import { h, isReducedMotion, uid } from '../lib/dom.js';
import { icon } from './icons.js';

let activeSheet = null;

function closeDirect(sheet, { restoreFocus = true } = {}) {
  if (!sheet || sheet.closed) return;

  sheet.element.classList.remove('is-open');
  const delay = isReducedMotion() ? 0 : 180;

  window.setTimeout(() => {
    if (sheet.element.open) sheet.element.close();
    sheet.element.remove();
    if (!activeSheet) document.body.style.overflow = sheet.previousOverflow;
    if (restoreFocus) sheet.trigger?.focus?.({ preventScroll: true });
    if (activeSheet === sheet) activeSheet = null;
    sheet.onClose?.();
  }, delay);
}

function finishClose({ fromPop = false, force = false } = {}) {
  const sheet = activeSheet;
  if (!sheet) return;

  if (!force && !fromPop && window.history.state?.pbSheet === sheet.id) {
    // Let the history entry pop and the capture listener close the sheet.
    window.history.back();
    return;
  }

  if (force && window.history.state?.pbSheet === sheet.id) {
    const nextState = { ...(window.history.state || {}) };
    delete nextState.pbSheet;
    window.history.replaceState(nextState, '', window.location.href);
  }

  activeSheet = null;
  closeDirect(sheet, { restoreFocus: !fromPop });
}

export function closeSheet(options = {}) {
  finishClose(options);
}

export function isSheetOpen() {
  return Boolean(activeSheet);
}

export function openSheet({ title, content, actions = null, wide = false, onClose = null }) {
  if (activeSheet) {
    const previous = activeSheet;
    activeSheet = null;
    closeDirect(previous, { restoreFocus: false });
  }

  const sheetId = uid('sheet');
  const titleId = `${sheetId}-title`;
  const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const previousOverflow = document.body.style.overflow;

  const closeButton = h(
    'button',
    {
      class: 'icon-btn',
      type: 'button',
      'aria-label': 'Close',
      onClick: () => finishClose(),
    },
    icon('x', { size: 22 }),
  );

  const actionNodes = actions
    ? Array.isArray(actions)
      ? actions
      : [actions]
    : [];

  const panel = h(
    'div',
    { class: 'sheet__panel' },
    h('div', { class: 'sheet__handle', 'aria-hidden': 'true' }),
    h(
      'div',
      { class: 'sheet__head' },
      h('h2', { class: 'sheet__title', id: titleId }, title),
      closeButton,
    ),
    h('div', { class: 'sheet__body' }, content),
    actionNodes.length ? h('div', { class: 'sheet__actions' }, actionNodes) : null,
  );

  const dialog = h(
    'dialog',
    {
      class: `sheet${wide ? ' sheet--wide' : ''}`,
      'aria-labelledby': titleId,
      id: sheetId,
    },
    panel,
  );

  document.body.appendChild(dialog);
  document.body.style.overflow = 'hidden';
  dialog.showModal();

  const sheet = {
    id: sheetId,
    element: dialog,
    trigger,
    previousOverflow,
    onClose,
    closed: false,
  };

  activeSheet = sheet;

  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    finishClose();
  });

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) finishClose();
  });

  dialog.addEventListener('close', () => {
    sheet.closed = true;
  });

  requestAnimationFrame(() => {
    if (dialog.open) dialog.classList.add('is-open');
  });

  window.history.pushState(
    { ...(window.history.state || {}), pbSheet: sheetId },
    '',
    window.location.href,
  );

  return {
    element: dialog,
    close: () => finishClose(),
    id: sheetId,
  };
}

window.addEventListener(
  'popstate',
  (event) => {
    if (!activeSheet) return;
    if (window.history.state?.pbSheet === activeSheet.id) return;
    event.stopImmediatePropagation();
    finishClose({ fromPop: true });
  },
  true,
);

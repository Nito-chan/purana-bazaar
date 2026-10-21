import { h } from '../lib/dom.js';
import { icon } from './icons.js';

let region = null;
let counter = 0;

function ensureRegion() {
  if (region && document.body.contains(region)) return region;
  region = h('div', {
    class: 'toast-region',
    id: 'toast-region',
    role: 'region',
    'aria-label': 'Notifications',
    'aria-live': 'polite',
    'aria-relevant': 'additions',
  });
  document.body.appendChild(region);
  return region;
}

function dismiss(element) {
  if (!element || element.dataset.leaving === 'true') return;
  element.dataset.leaving = 'true';
  element.classList.add('is-leaving');
  window.setTimeout(() => element.remove(), 200);
}

export function toast(message, options = {}) {
  if (!message) return () => {};
  const {
    type = 'info',
    duration = type === 'error' ? 6500 : 4500,
    action = null,
    iconName = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info',
  } = options;

  const host = ensureRegion();
  const id = `toast-${++counter}`;
  const existing = Array.from(host.children).filter((item) => item.dataset.leaving !== 'true');
  if (existing.length >= 3) dismiss(existing[0]);

  const closeButton = h(
    'button',
    {
      class: 'toast__close',
      type: 'button',
      'aria-label': 'Close notification',
      onClick: () => dismiss(element),
    },
    icon('x', { size: 16 }),
  );

  const actionButton = action
    ? h(
        'button',
        {
          class: 'toast__action',
          type: 'button',
          onClick: () => {
            try {
              action.onClick?.();
            } finally {
              dismiss(element);
            }
          },
        },
        action.label,
      )
    : null;

  const element = h(
    'div',
    {
      class: `toast toast--${type}`,
      id,
      role: type === 'error' ? 'alert' : 'status',
    },
    h('span', { class: 'toast__icon' }, icon(iconName, { size: 18 })),
    h(
      'div',
      { class: 'toast__body' },
      h('div', {}, message),
      actionButton,
    ),
    closeButton,
  );

  host.appendChild(element);

  let timer = null;
  let remaining = duration;
  let startedAt = 0;

  const start = () => {
    if (!duration) return;
    startedAt = Date.now();
    timer = window.setTimeout(() => dismiss(element), remaining);
  };

  const pause = () => {
    if (!timer) return;
    window.clearTimeout(timer);
    timer = null;
    remaining -= Date.now() - startedAt;
    if (remaining < 800) remaining = 800;
  };

  const resume = () => {
    if (!duration || timer) return;
    start();
  };

  element.addEventListener('mouseenter', pause);
  element.addEventListener('mouseleave', resume);
  element.addEventListener('focusin', pause);
  element.addEventListener('focusout', (event) => {
    if (!element.contains(event.relatedTarget)) resume();
  });

  start();
  return () => dismiss(element);
}

toast.success = (message, options = {}) => toast(message, { ...options, type: 'success' });
toast.error = (message, options = {}) => toast(message, { ...options, type: 'error' });
toast.info = (message, options = {}) => toast(message, { ...options, type: 'info' });

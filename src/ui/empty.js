import { h } from '../lib/dom.js';
import { navigate } from '../lib/navigation.js';
import { icon } from './icons.js';

function actionNode(action) {
  if (!action) return null;
  if (action instanceof Node) return action;

  const { label, href, onClick, variant = 'secondary' } = action;
  if (href) {
    return h(
      'a',
      {
        class: `btn btn--${variant}`,
        href,
        onClick: (event) => {
          if (onClick) {
            event.preventDefault();
            onClick(event);
          }
        },
      },
      label,
    );
  }

  return h(
    'button',
    {
      class: `btn btn--${variant}`,
      type: 'button',
      onClick,
    },
    label,
  );
}

export function emptyState({ iconName = 'inbox', title, body, actions = [] }) {
  return h(
    'div',
    { class: 'empty' },
    h('div', { class: 'empty__icon' }, icon(iconName, { size: 26 })),
    h('h2', { class: 'empty__title' }, title),
    body ? h('p', { class: 'empty__body' }, body) : null,
    actions.length ? h('div', { class: 'empty__actions' }, actions.map(actionNode)) : null,
  );
}

export function errorState({ title, body, retryLabel, onRetry, homeLabel, showHome = true } = {}) {
  const actions = [];
  if (onRetry) {
    actions.push(
      actionNode({
        label: retryLabel || 'Try again',
        variant: 'primary',
        onClick: onRetry,
      }),
    );
  }
  if (showHome) {
    actions.push(
      actionNode({
        label: homeLabel || 'Go home',
        variant: 'secondary',
        href: '/',
        onClick: () => navigate('/'),
      }),
    );
  }

  return h(
    'div',
    { class: 'empty', role: 'alert' },
    h('div', { class: 'empty__icon' }, icon('alert-circle', { size: 26 })),
    h('h2', { class: 'empty__title' }, title),
    body ? h('p', { class: 'empty__body' }, body) : null,
    actions.length ? h('div', { class: 'empty__actions' }, actions) : null,
  );
}

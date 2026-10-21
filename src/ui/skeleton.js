import { h } from '../lib/dom.js';

function line(extraClass = '') {
  return h('div', { class: `skeleton skeleton--text ${extraClass}`.trim(), 'aria-hidden': 'true' });
}

export function skeletonCard() {
  return h(
    'div',
    { class: 'skeleton-card', 'aria-hidden': 'true' },
    h('div', { class: 'skeleton skeleton-card__media' }),
    h(
      'div',
      { class: 'skeleton-card__body' },
      h('div', { class: 'skeleton skeleton--title', style: { width: '46%' } }),
      line(),
      line(),
      line(),
    ),
  );
}

export function skeletonGrid(count = 8, className = 'listing-grid') {
  return h(
    'div',
    { class: className, 'aria-hidden': 'true' },
    Array.from({ length: count }, () => skeletonCard()),
  );
}

export function skeletonRows(count = 4) {
  return h(
    'div',
    { class: 'stack', 'aria-hidden': 'true' },
    Array.from({ length: count }, () =>
      h(
        'div',
        { class: 'skeleton-row' },
        h('div', {
          class: 'skeleton',
          style: { width: '56px', height: '56px', borderRadius: '50%', flex: 'none' },
        }),
        h(
          'div',
          { class: 'skeleton-row__text' },
          h('div', { class: 'skeleton skeleton--title', style: { width: '42%' } }),
          line(),
        ),
      ),
    ),
  );
}

export function skeletonDetail() {
  return h(
    'div',
    { class: 'listing-detail', 'aria-busy': 'true' },
    h('div', { class: 'skeleton skeleton-detail__media' }),
    h(
      'div',
      { class: 'skeleton-detail__body' },
      h('div', { class: 'skeleton skeleton--title', style: { width: '32%' } }),
      h('div', { class: 'skeleton skeleton--title', style: { width: '82%', height: '30px' } }),
      line(),
      line(),
      h('div', { class: 'skeleton skeleton--title', style: { width: '100%', height: '48px' } }),
      line(),
      line(),
    ),
  );
}

export function pageSkeleton({ title = 'Loading' } = {}) {
  return h(
    'div',
    { class: 'container page', 'aria-busy': 'true' },
    h('span', { class: 'sr-only' }, title),
    h('div', { class: 'skeleton skeleton--title', style: { width: '48%', height: '28px' } }),
    h('div', { class: 'skeleton skeleton--title', style: { width: '30%', marginTop: '12px' } }),
    h(
      'div',
      { style: { marginTop: '20px' } },
      skeletonGrid(8),
    ),
  );
}

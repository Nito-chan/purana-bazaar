import { h } from '../lib/dom.js';
import { initials } from '../lib/format.js';
import { safeImageUrl } from '../lib/url.js';
import { icon } from './icons.js';

export function avatar({ name = '', src = '', size = 'md', verified = false, className = '' } = {}) {
  const classes = ['avatar', size !== 'md' ? `avatar--${size}` : '', verified ? 'avatar--verified' : '', className]
    .filter(Boolean)
    .join(' ');
  const image = safeImageUrl(src);
  const element = h(
    'span',
    { class: classes, 'aria-hidden': 'true' },
    image
      ? h('img', { src: image, alt: '', width: size === 'sm' ? 34 : size === 'lg' ? 64 : 44, height: size === 'sm' ? 34 : size === 'lg' ? 64 : 44, loading: 'lazy' })
      : initials(name),
  );
  return element;
}

export function stars({ rating = 0, count = 0 } = {}) {
  const value = Number(rating) || 0;
  return h(
    'span',
    { class: 'stars', 'aria-label': `${value.toFixed(1)} out of 5` },
    icon('star', { size: 14 }),
    h('span', {}, value.toFixed(1)),
    count ? h('span', { class: 'stars__count' }, `(${count})`) : null,
  );
}

export function verifiedMark(label = 'Verified') {
  return h(
    'span',
    { class: 'text-success', title: label, 'aria-label': label },
    icon('badge-check', { size: 15 }),
  );
}

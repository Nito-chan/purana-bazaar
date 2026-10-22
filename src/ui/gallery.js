import { h } from '../lib/dom.js';
import { onCleanup } from '../lib/lifecycle.js';
import { t } from '../i18n/index.js';
import { icon } from './icons.js';

export function gallery(images) {
  let current = 0;
  const counter = h(
    'span',
    { class: 'gallery__counter', 'aria-live': 'polite' },
    t('listing.photoCounter', { current: 1, total: images.length }),
  );

  const track = h(
    'div',
    {
      class: 'gallery__track',
      role: 'group',
      tabindex: '0',
      'aria-label': t('listing.photos'),
      'aria-roledescription': 'carousel',
    },
    images.map((image, index) =>
      h(
        'div',
        {
          class: 'gallery__slide',
          role: 'group',
          'aria-roledescription': 'slide',
          'aria-label': `${index + 1} / ${images.length}`,
        },
        h('img', {
          class: 'gallery__img',
          src: image.url,
          alt: image.alt,
          width: 800,
          height: 800,
          loading: index === 0 ? 'eager' : 'lazy',
          decoding: 'async',
        }),
      ),
    ),
  );

  const goTo = (index) => {
    const next = Math.min(Math.max(index, 0), images.length - 1);
    track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' });
  };

  const updateCounter = () => {
    if (!track.clientWidth) return;
    const next = Math.round(track.scrollLeft / track.clientWidth);
    if (next === current) return;
    current = next;
    counter.textContent = t('listing.photoCounter', {
      current: current + 1,
      total: images.length,
    });
  };

  let frame = 0;
  const onScroll = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      updateCounter();
    });
  };
  track.addEventListener('scroll', onScroll, { passive: true });
  onCleanup(() => {
    track.removeEventListener('scroll', onScroll);
    if (frame) cancelAnimationFrame(frame);
  });

  const showNav = images.length > 1;
  return h(
    'div',
    { class: 'gallery' },
    track,
    showNav
      ? h(
          'button',
          {
            class: 'gallery__nav gallery__nav--prev',
            type: 'button',
            'aria-label': t('common.back'),
            onClick: () => goTo(current - 1),
          },
          icon('chevron-left', { size: 22 }),
        )
      : null,
    showNav
      ? h(
          'button',
          {
            class: 'gallery__nav gallery__nav--next',
            type: 'button',
            'aria-label': t('common.next'),
            onClick: () => goTo(current + 1),
          },
          icon('chevron-right', { size: 22 }),
        )
      : null,
    showNav ? counter : null,
  );
}

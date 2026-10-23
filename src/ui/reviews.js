import { h } from '../lib/dom.js';
import { formatRelativeTime } from '../lib/format.js';
import { stars } from './avatar.js';
import { icon } from './icons.js';
import { t } from '../i18n/index.js';

export function reviewList({ reviews, language }) {
  if (!reviews.length) {
    return h(
      'div',
      { class: 'reviews-empty' },
      h('p', { class: 'strong' }, t('reviews.noReviews')),
    );
  }

  return h(
    'div',
    { class: 'review-list' },
    ...reviews.map((review) => reviewNode(review, language)),
  );
}

export function reviewNode(review, language) {
  return h(
    'div',
    { class: 'review' },
    h(
      'div',
      { class: 'review__head' },
      h('span', { class: 'review__author' }, review.reviewerName || 'A buyer'),
      h('span', { class: 'review__rating' }, stars({ rating: review.rating })),
      h('span', { class: 'review__time' }, formatRelativeTime(review.createdAt, language)),
    ),
    h('p', { class: 'review__body' }, review.body),
  );
}

export function reviewForm({ listingId, sellerId, onSubmit, rating, error, submitting }) {
  const stars = [1, 2, 3, 4, 5];

  return h(
    'form',
    {
      class: 'review-form',
      noValidate: true,
      onSubmit: async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        const selected = Number(formData.get('rating'));
        const message = String(formData.get('body') ?? '').trim();
        if (!Number.isInteger(selected) || selected < 1 || selected > 5 || !message) return;
        await onSubmit({ listingId, sellerId, rating: selected, body: message });
      },
    },
    h(
      'div',
      { class: 'review-form__row' },
      h('label', { class: 'review-form__label' }, t('reviews.ratingLabel')),
      h(
        'div',
        { class: 'star-picker', role: 'radiogroup', 'aria-label': t('reviews.ratingLabel') },
        ...stars.map((value) =>
          h(
            'label',
            {
              class: `star-picker__star${rating === value ? ' star-picker__star--filled' : ''}`,
            },
            h('input', {
              type: 'radio',
              name: 'rating',
              id: `review-rating-${value}`,
              value: String(value),
              checked: rating === value,
              required: true,
            }),
            icon('star', { size: 20 }),
          ),
        ),
      ),
    ),
    h(
      'div',
      { class: 'review-form__row' },
      h('label', { class: 'review-form__label' }, t('reviews.reviewPlaceholder').slice(0, -1)),
      h('textarea', {
        class: 'field__textarea',
        name: 'body',
        placeholder: t('reviews.reviewPlaceholder'),
        maxlength: '1000',
        rows: '4',
        required: true,
      }),
    ),
    error
      ? h('p', { class: 'field__error' }, icon('alert-circle', { size: 16 }), h('span', {}, error))
      : null,
    h(
      'button',
      { class: 'btn btn--primary', type: 'submit', disabled: submitting },
      submitting ? t('reviews.submitting') : t('reviews.submit'),
    ),
  );
}

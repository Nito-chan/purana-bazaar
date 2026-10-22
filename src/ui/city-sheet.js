import { closeSheet, openSheet } from './sheet.js';
import { h } from '../lib/dom.js';
import { cityLabel, t } from '../i18n/index.js';
import { applyCity } from '../lib/preferences.js';
import { store } from '../store.js';
import { icon } from './icons.js';

export function openCitySheet() {
  const state = store.getState();
  const selectedId = state.cityId;

  const option = (city) => {
    const selected = city ? city.id === selectedId : !selectedId;
    return h(
      'button',
      {
        class: `sheet__option${selected ? ' is-selected' : ''}`,
        type: 'button',
        'aria-pressed': String(selected),
        onClick: () => {
          closeSheet({ force: true });
          applyCity(city ? city.id : null);
        },
      },
      icon('map-pin', { size: 20, className: 'city-chip__icon' }),
      h(
        'span',
        { class: 'sheet__option-body' },
        h('span', { class: 'sheet__option-title' }, city ? cityLabel(city) : t('home.allCities')),
        h('span', { class: 'sheet__option-meta' }, city ? city.state : t('city.subtitle')),
      ),
      selected ? h('span', { class: 'sheet__option-check' }, icon('check', { size: 20 })) : null,
    );
  };

  const content = h(
    'div',
    { class: 'sheet__list' },
    state.cities.map(option),
    h('div', { class: 'divider' }),
    option(null),
    h('p', { class: 'auth-note' }, t('city.subtitle')),
  );

  openSheet({ title: t('city.title'), content });
}

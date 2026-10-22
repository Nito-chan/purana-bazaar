import { api } from '../api/index.js';
import { h } from '../lib/dom.js';
import { formatRelativeTime } from '../lib/format.js';
import { t } from '../i18n/index.js';
import { isSignedIn } from '../lib/auth.js';
import { currentPath } from '../lib/url.js';
import { navigate, refresh } from '../lib/navigation.js';
import { setPageTitle } from '../lib/seo.js';
import { refreshBadges } from '../lib/session.js';
import { store } from '../store.js';
import { authRequiredState, errorState } from '../ui/auth-gate.js';
import { emptyState } from '../ui/empty.js';
import { icon } from '../ui/icons.js';
import { toast } from '../ui/toast.js';

const TYPE_ICONS = {
  message: 'message-circle',
  listing: 'tag',
  saved: 'heart',
  system: 'bell',
};

export async function render() {
  document.body.dataset.page = 'notifications';
  setPageTitle(t('notifications.title'));

  if (!isSignedIn()) {
    return h(
      'div',
      { class: 'container page' },
      h('h1', { class: 'page-title' }, t('notifications.title')),
      h('div', { style: { marginTop: '16px' } }, authRequiredState({ next: currentPath() })),
    );
  }

  let items;
  try {
    items = await api.notifications.list();
  } catch {
    return h(
      'div',
      { class: 'container page' },
      errorState({ onRetry: () => window.location.reload() }),
    );
  }

  const language = store.getState().language;
  const hasUnread = items.some((item) => item.isUnread);

  const markAll = h(
    'button',
    {
      class: 'btn btn--secondary btn--sm',
      type: 'button',
      disabled: !hasUnread,
      onClick: async () => {
        markAll.disabled = true;
        try {
          await api.notifications.markAllRead();
          await refreshBadges();
          toast.success(t('notifications.allRead'));
          refresh();
        } catch {
          markAll.disabled = false;
          toast.error(t('common.genericError'));
        }
      },
    },
    icon('check', { size: 16 }),
    t('notifications.markAllRead'),
  );

  return h(
    'div',
    { class: 'container page' },
    h(
      'div',
      { class: 'page-head' },
      h(
        'div',
        {},
        h('h1', { class: 'page-title' }, t('notifications.title')),
        h('p', { class: 'text-muted' }, t('notifications.subtitle')),
      ),
      markAll,
    ),
    items.length
      ? h(
          'div',
          { class: 'notification-list' },
          items.map((item) =>
            h(
              'a',
              {
                class: `notification${item.isUnread ? ' notification--unread' : ''}`,
                href: item.link || '/notifications',
                onClick: async (event) => {
                  event.preventDefault();
                  try {
                    if (item.isUnread) {
                      await api.notifications.markRead(item.id);
                      await refreshBadges();
                    }
                  } catch {
                    // Navigation is still useful if marking read fails.
                  }
                  if (item.link) navigate(item.link);
                },
              },
              h(
                'span',
                { class: 'notification__icon' },
                icon(TYPE_ICONS[item.type] || 'bell', { size: 19 }),
              ),
              h(
                'span',
                { class: 'notification__body' },
                h(
                  'span',
                  { class: 'notification__title' },
                  item.title,
                  item.isUnread
                    ? h('span', { class: 'sr-only' }, ` — ${t('notifications.unread')}`)
                    : null,
                ),
                h('span', { class: 'notification__text' }, item.body),
                h(
                  'span',
                  { class: 'notification__time' },
                  formatRelativeTime(item.createdAt, language),
                ),
              ),
              h(
                'span',
                { class: 'menu-row__chevron', 'aria-hidden': 'true' },
                icon('chevron-right', { size: 18 }),
              ),
            ),
          ),
        )
      : emptyState({
          iconName: 'bell',
          title: t('notifications.emptyTitle'),
          body: t('notifications.emptyBody'),
          actions: [{ label: t('saved.browse'), href: '/', variant: 'primary' }],
        }),
  );
}

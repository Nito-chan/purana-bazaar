import { api } from '../api/index.js';
import { config } from '../config.js';
import { h } from '../lib/dom.js';
import { formatRelativeTime, truncate } from '../lib/format.js';
import { t } from '../i18n/index.js';
import { isSignedIn } from '../lib/auth.js';
import { currentPath } from '../lib/url.js';
import { setPageTitle } from '../lib/seo.js';
import { store } from '../store.js';
import { authRequiredState, errorState } from '../ui/auth-gate.js';
import { avatar } from '../ui/avatar.js';
import { emptyState } from '../ui/empty.js';

export async function render() {
  document.body.dataset.page = 'chats';
  setPageTitle(t('chats.title'));

  if (!isSignedIn()) {
    return h(
      'div',
      { class: 'container page' },
      h('h1', { class: 'page-title' }, t('chats.title')),
      h('div', { style: { marginTop: '16px' } }, authRequiredState({ next: currentPath() })),
    );
  }

  let conversations;
  try {
    conversations = await api.chats.list();
  } catch {
    return h(
      'div',
      { class: 'container page' },
      errorState({ onRetry: () => window.location.reload() }),
    );
  }

  const language = store.getState().language;

  return h(
    'div',
    { class: 'container page' },
    h(
      'div',
      { class: 'page-head' },
      h(
        'div',
        {},
        h('h1', { class: 'page-title' }, t('chats.title')),
        h('p', { class: 'text-muted' }, t('chats.subtitle')),
      ),
    ),
    conversations.length
      ? h(
          'div',
          { class: 'conversation-list' },
          conversations.map((conversation) => {
            const other = conversation.otherUser;
            const message = conversation.lastMessage;
            return h(
              'a',
              {
                class: 'conversation',
                href: `/chat/${conversation.id}`,
              },
              avatar({ name: other?.name || '', size: 'md', verified: Boolean(other?.isVerified) }),
              h(
                'span',
                { class: 'conversation__body' },
                h(
                  'span',
                  { class: 'conversation__top' },
                  h('span', { class: 'conversation__name' }, other?.name || ''),
                  h(
                    'span',
                    { class: 'conversation__time' },
                    formatRelativeTime(conversation.lastMessageAt, language),
                  ),
                ),
                h('span', { class: 'conversation__listing' }, conversation.listing?.title || ''),
                h(
                  'span',
                  { class: 'conversation__preview' },
                  message ? truncate(message.body, 70) : t('chats.noMessages'),
                ),
              ),
              conversation.unreadCount
                ? h(
                    'span',
                    {
                      class: 'conversation__unread',
                      'aria-label': t('chats.unread', { count: conversation.unreadCount }),
                    },
                    String(conversation.unreadCount),
                  )
                : null,
            );
          }),
        )
      : emptyState({
          iconName: 'message-circle',
          title: t('chats.emptyTitle'),
          body: t('chats.emptyBody'),
          actions: [{ label: t('chats.browse'), href: '/', variant: 'primary' }],
        }),
    config.useMock ? h('p', { class: 'auth-note' }, t('chats.demoNote')) : null,
  );
}

import { api } from '../api/index.js';
import { config } from '../config.js';
import { h } from '../lib/dom.js';
import { formatDate, formatPrice, formatTime } from '../lib/format.js';
import { t } from '../i18n/index.js';
import { isSignedIn } from '../lib/auth.js';
import { currentPath, listingPath } from '../lib/url.js';
import { refresh } from '../lib/navigation.js';
import { setPageTitle } from '../lib/seo.js';
import { refreshBadges } from '../lib/session.js';
import { store } from '../store.js';
import { authRequiredState } from '../ui/auth-gate.js';
import { avatar } from '../ui/avatar.js';
import { closeSheet, openSheet } from '../ui/sheet.js';
import { emptyState } from '../ui/empty.js';
import { icon } from '../ui/icons.js';
import { openReportSheet } from '../ui/report-sheet.js';
import { toast } from '../ui/toast.js';

function dayKey(iso) {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(iso, language) {
  const date = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const key = dayKey(iso);
  if (key === dayKey(now.toISOString())) return t('chat.today');
  if (key === dayKey(yesterday.toISOString())) return t('chat.yesterday');
  return formatDate(date.toISOString(), language);
}

export async function render({ params }) {
  document.body.dataset.page = 'chat';
  setPageTitle(t('chats.title'));

  if (!isSignedIn()) {
    return h('div', { class: 'container page' }, authRequiredState({ next: currentPath() }));
  }

  let data;
  try {
    data = await api.chats.get(params.id);
  } catch {
    return h(
      'div',
      { class: 'container page' },
      emptyState({
        iconName: 'message-circle',
        title: t('errors.notFound'),
        body: t('chats.emptyBody'),
        actions: [{ label: t('chats.browse'), href: '/chats', variant: 'primary' }],
      }),
    );
  }

  const { conversation, messages } = data;
  const other = conversation.otherUser;
  const listing = conversation.listing;
  const language = store.getState().language;
  const blocked = conversation.isBlocked;
  const closed = !listing || listing.status !== 'active';
  setPageTitle(other?.name || t('chats.title'));

  api.chats
    .markRead(conversation.id)
    .then(() => refreshBadges())
    .catch(() => {});

  const messagesHost = h('div', { class: 'chat-messages', role: 'log', 'aria-live': 'polite' });
  let lastDay = '';

  function messageNode(message) {
    return h(
      'div',
      { class: `msg${message.isMine ? ' msg--mine' : ''}` },
      h('div', { class: 'msg__bubble' }, message.body),
      h(
        'time',
        { class: 'msg__time', datetime: message.createdAt },
        formatTime(message.createdAt, language),
      ),
    );
  }

  function appendDayIfNeeded(iso) {
    const key = dayKey(iso);
    if (key === lastDay) return;
    lastDay = key;
    messagesHost.appendChild(h('div', { class: 'chat-day' }, dayLabel(iso, language)));
  }

  function appendMessage(message) {
    messagesHost.querySelector('.chat-empty')?.remove();
    appendDayIfNeeded(message.createdAt);
    messagesHost.appendChild(messageNode(message));
  }

  if (messages.length) {
    for (const message of messages) appendMessage(message);
  } else {
    messagesHost.appendChild(
      h(
        'div',
        { class: 'chat-empty' },
        h('p', { class: 'strong' }, t('chats.noMessages')),
        h('p', { class: 'text-sm text-muted' }, t('chats.emptyBody')),
      ),
    );
  }

  let sending = false;
  const composerInput = h('textarea', {
    class: 'chat-composer__input',
    id: 'chat-message',
    name: 'message',
    rows: '1',
    maxlength: '1000',
    placeholder: t('chat.placeholder'),
    'aria-label': t('chat.placeholder'),
  });
  const sendButton = h(
    'button',
    { class: 'chat-composer__send', type: 'submit', 'aria-label': t('chat.send'), disabled: true },
    icon('send', { size: 20 }),
  );

  function updateComposer() {
    sendButton.disabled = !composerInput.value.trim().length || sending;
    composerInput.style.height = 'auto';
    composerInput.style.height = `${Math.min(composerInput.scrollHeight, 120)}px`;
  }

  composerInput.addEventListener('input', updateComposer);

  const composerForm = h(
    'form',
    {
      class: 'chat-composer__form',
      onSubmit: async (event) => {
        event.preventDefault();
        if (sending) return;
        const body = composerInput.value.trim();
        if (!body) {
          composerInput.focus();
          return;
        }

        sending = true;
        sendButton.disabled = true;
        try {
          const message = await api.chats.send(conversation.id, body);
          composerInput.value = '';
          updateComposer();
          appendMessage(message);
          messagesHost.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          composerInput.focus();
        } catch {
          toast.error(t('chat.sendError'));
        } finally {
          sending = false;
          updateComposer();
        }
      },
    },
    composerInput,
    sendButton,
  );

  composerInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!sendButton.disabled) composerForm.requestSubmit();
    }
  });

  function quickReply(label) {
    composerInput.value = label;
    updateComposer();
    composerInput.focus();
  }

  const quickReplies = h(
    'div',
    { class: 'chat-quick', role: 'group', 'aria-label': t('chat.quick.available') },
    h(
      'button',
      {
        class: 'chat-quick__chip',
        type: 'button',
        onClick: () => quickReply(t('chat.quick.available')),
      },
      t('chat.quick.available'),
    ),
    h(
      'button',
      {
        class: 'chat-quick__chip',
        type: 'button',
        onClick: () => quickReply(t('chat.quick.lastPrice')),
      },
      t('chat.quick.lastPrice'),
    ),
    h(
      'button',
      {
        class: 'chat-quick__chip',
        type: 'button',
        onClick: () => quickReply(t('chat.quick.today')),
      },
      t('chat.quick.today'),
    ),
  );

  async function toggleBlock() {
    closeSheet({ force: true });
    try {
      const result = await api.blocks.toggle(other.id);
      toast.success(t(result.blocked ? 'seller.blocked' : 'seller.unblocked'));
      refresh();
    } catch {
      toast.error(t('common.genericError'));
    }
  }

  function openMenu() {
    const option = (label, iconName, onClick) =>
      h(
        'button',
        { class: 'sheet__option', type: 'button', onClick },
        icon(iconName, { size: 20 }),
        h(
          'span',
          { class: 'sheet__option-body' },
          h('span', { class: 'sheet__option-title' }, label),
        ),
      );

    openSheet({
      title: t('chat.menu'),
      content: h(
        'div',
        { class: 'sheet__list' },
        option(t('chat.reportSeller'), 'flag', () => {
          closeSheet({ force: true });
          openReportSheet({ userId: other?.id || null });
        }),
        option(
          t(blocked ? 'chat.unblockSeller' : 'chat.blockSeller'),
          blocked ? 'check-circle' : 'ban',
          toggleBlock,
        ),
      ),
    });
  }

  const blockedNotice = blocked
    ? h(
        'div',
        { class: 'alert alert--danger', role: 'status', style: { marginTop: '12px' } },
        icon('ban', { size: 18 }),
        h(
          'div',
          {},
          h('p', { class: 'strong' }, t('chat.blocked')),
          h('p', { class: 'text-sm' }, t('chat.unblockHint')),
        ),
        h(
          'button',
          { class: 'btn btn--secondary btn--sm', type: 'button', onClick: toggleBlock },
          t('common.unblock'),
        ),
      )
    : null;

  const closedNotice =
    closed && !blocked
      ? h(
          'div',
          { class: 'alert alert--warning', style: { marginTop: '12px' } },
          icon('info', { size: 18 }),
          h(
            'div',
            {},
            h('p', { class: 'strong' }, t('listing.soldTitle')),
            h('p', { class: 'text-sm' }, t('listing.soldBody')),
          ),
        )
      : null;

  const canMessage = !blocked && !closed;

  const composer = canMessage
    ? h('div', { class: 'chat-composer' }, quickReplies, composerForm)
    : null;

  return h(
    'div',
    { class: 'container chat-page page' },
    h(
      'div',
      { class: 'chat-topbar' },
      h(
        'a',
        { class: 'icon-btn', href: '/chats', 'aria-label': t('common.back') },
        icon('chevron-left', { size: 22 }),
      ),
      avatar({ name: other?.name || '', size: 'sm', verified: Boolean(other?.isVerified) }),
      h(
        'div',
        { class: 'chat-topbar__body' },
        other
          ? h('a', { class: 'chat-topbar__name', href: `/u/${other.id}` }, other.name)
          : h('span', { class: 'chat-topbar__name' }, t('common.error')),
        h(
          'div',
          { class: 'chat-topbar__meta' },
          listing
            ? h('a', { href: listingPath(listing) }, listing.title)
            : t('listing.notFoundTitle'),
        ),
      ),
      h(
        'button',
        {
          class: 'icon-btn',
          type: 'button',
          'aria-label': t('chat.menu'),
          onClick: openMenu,
        },
        icon('more-vertical', { size: 22 }),
      ),
    ),
    listing
      ? h(
          'a',
          { class: 'chat-listing', href: listingPath(listing) },
          listing.images?.[0]
            ? h('img', {
                class: 'chat-listing__media',
                src: listing.images[0].thumbUrl || listing.images[0].url,
                alt: listing.images[0].alt || listing.title,
                width: 104,
                height: 104,
                loading: 'lazy',
              })
            : null,
          h(
            'span',
            { class: 'chat-listing__body' },
            h('span', { class: 'chat-listing__title' }, listing.title),
            h('span', { class: 'chat-listing__price' }, formatPrice(listing.price)),
          ),
          h('span', { class: 'menu-row__chevron' }, icon('chevron-right', { size: 18 })),
        )
      : null,
    blockedNotice,
    closedNotice,
    messagesHost,
    canMessage
      ? h(
          'p',
          { class: 'chat-demo-note' },
          icon('shield-check', { size: 14 }),
          ' ',
          t('chat.safety'),
        )
      : null,
    config.useMock ? h('p', { class: 'chat-demo-note' }, t('chat.demoNote')) : null,
    composer,
  );
}

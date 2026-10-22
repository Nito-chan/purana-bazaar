import { api } from '../api/index.js';
import { store } from '../store.js';

export async function syncSession() {
  const auth = await api.auth.session();
  store.setState({ auth });
  await refreshBadges();
  return auth;
}

export async function refreshBadges() {
  const auth = store.getState().auth;
  if (auth.status !== 'signedIn') {
    store.setState({ unreadNotifications: 0, unreadChats: 0 });
    return;
  }
  const [notifications, chats] = await Promise.all([
    api.notifications.unread(),
    api.chats.unread(),
  ]);
  store.setState({
    unreadNotifications: Number(notifications?.count) || 0,
    unreadChats: Number(chats?.count) || 0,
  });
}

export function setSignedIn(auth) {
  store.setState({ auth: auth || { status: 'anonymous', user: null, profile: null } });
}

export function setSignedOut() {
  store.setState({
    auth: { status: 'anonymous', user: null, profile: null },
    unreadNotifications: 0,
    unreadChats: 0,
  });
}

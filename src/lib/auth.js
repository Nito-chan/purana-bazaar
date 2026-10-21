import { store } from '../store.js';
import { navigate } from './navigation.js';
import { currentPath } from './url.js';

export function getSession() {
  return store.getState().auth;
}

export function isSignedIn() {
  return getSession().status === 'signedIn';
}

export function currentUser() {
  return getSession().user;
}

export function currentProfile() {
  return getSession().profile;
}

export function loginPath(next = currentPath()) {
  return `/login?next=${encodeURIComponent(next)}`;
}

export function requireAuth(next = currentPath()) {
  if (isSignedIn()) return true;
  navigate(loginPath(next));
  return false;
}

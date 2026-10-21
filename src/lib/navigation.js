let navigationHandler = null;
let refreshHandler = null;

export function setNavigationHandler(handler) {
  navigationHandler = handler;
}

export function setRefreshHandler(handler) {
  refreshHandler = handler;
}

export function navigate(path, options = {}) {
  if (typeof navigationHandler === 'function') {
    navigationHandler(path, options);
    return;
  }
  window.location.assign(path);
}

export function refresh() {
  if (typeof refreshHandler === 'function') refreshHandler();
  else window.location.reload();
}

export function replaceUrl(path, state = window.history.state) {
  window.history.replaceState(state, '', path);
}

export function pushUrl(path, state = {}) {
  window.history.pushState(state, '', path);
}

export function back() {
  window.history.back();
}

export function getQuery() {
  return new URLSearchParams(window.location.search);
}

export function getPath() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

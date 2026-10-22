/**
 * Tiny DOM builder. It only ever writes text nodes, never user HTML.
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);

  append(el, ...children);

  if (props && typeof props === 'object') {
    for (const [key, value] of Object.entries(props)) {
      if (value === null || value === undefined || value === false) continue;

      if (key === 'class' || key === 'className') {
        if (value) el.className = String(value);
      } else if (key === 'text') {
        el.textContent = String(value);
      } else if (key === 'dataset') {
        for (const [dataKey, dataValue] of Object.entries(value)) {
          if (dataValue !== null && dataValue !== undefined)
            el.dataset[dataKey] = String(dataValue);
        }
      } else if (key === 'style' && typeof value === 'object') {
        for (const [styleKey, styleValue] of Object.entries(value)) {
          if (styleValue === null || styleValue === undefined) continue;
          if (styleKey.includes('-')) el.style.setProperty(styleKey, String(styleValue));
          else el.style[styleKey] = String(styleValue);
        }
      } else if (key === 'ref' && typeof value === 'function') {
        value(el);
      } else if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (
        ['value', 'checked', 'selected', 'disabled', 'indeterminate', 'tabIndex'].includes(key)
      ) {
        el[key] = value;
      } else if (value === true) {
        el.setAttribute(key, '');
      } else {
        el.setAttribute(key, String(value));
      }
    }
  }

  return el;
}

export function append(parent, ...children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false || child === true) continue;
    if (child instanceof Node) parent.appendChild(child);
    else parent.appendChild(document.createTextNode(String(child)));
  }
  return parent;
}

export function frag(...children) {
  const fragment = document.createDocumentFragment();
  append(fragment, ...children);
  return fragment;
}

export function clear(node) {
  if (node) node.replaceChildren();
}

export function text(value) {
  return document.createTextNode(value === null || value === undefined ? '' : String(value));
}

export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

export function on(target, event, handler, options) {
  target.addEventListener(event, handler, options);
  return () => target.removeEventListener(event, handler, options);
}

export function delegate(root, selector, event, handler) {
  const listener = (nativeEvent) => {
    const target =
      nativeEvent.target instanceof Element ? nativeEvent.target.closest(selector) : null;
    if (target && root.contains(target)) handler(nativeEvent, target);
  };
  root.addEventListener(event, listener);
  return () => root.removeEventListener(event, listener);
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function clamp(value, min, max) {
  return Math.min(Math.max(Number(value) || 0, min), max);
}

export function uid(prefix = 'pb') {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function isReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export function scrollToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: isReducedMotion() ? 'auto' : 'smooth' });
}

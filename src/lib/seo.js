export function setPageTitle(title) {
  const appName = 'Purana Bazaar';
  document.title = title ? `${title} · ${appName}` : `${appName} — Buy and sell used things nearby`;
}

export function setPageDescription(description) {
  if (!description) return;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute('content', description);
}

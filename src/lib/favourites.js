import { api } from '../api/index.js';
import { t } from '../i18n/index.js';
import { toast } from '../ui/toast.js';
import { isSignedIn, loginPath } from './auth.js';
import { navigate } from './navigation.js';
import { currentPath } from './url.js';

export async function toggleFavourite(listing, button, options = {}) {
  if (!listing) return;
  if (!isSignedIn()) {
    navigate(loginPath(currentPath()));
    return;
  }

  const previous = button?.classList.contains('is-active');
  if (button) {
    button.disabled = true;
    button.classList.toggle('is-active', !previous);
    button.setAttribute('aria-pressed', String(!previous));
    button.setAttribute('aria-label', t(!previous ? 'listing.unsave' : 'listing.save'));
  }

  try {
    const result = await api.favourites.toggle(listing.id);
    listing.isFavourite = result.saved;
    if (button) {
      button.classList.toggle('is-active', result.saved);
      button.setAttribute('aria-pressed', String(result.saved));
      button.setAttribute('aria-label', t(result.saved ? 'listing.unsave' : 'listing.save'));
    }
    toast.success(t(result.saved ? 'saved.added' : 'saved.removed'));
    options.onChange?.(result.saved);
  } catch {
    if (button) {
      button.classList.toggle('is-active', previous);
      button.setAttribute('aria-pressed', String(previous));
      button.setAttribute('aria-label', t(previous ? 'listing.unsave' : 'listing.save'));
    }
    toast.error(t('errors.favouriteFailed'));
  } finally {
    if (button) button.disabled = false;
  }
}

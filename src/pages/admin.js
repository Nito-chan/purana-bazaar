import { api } from '../api/index.js';
import { h } from '../lib/dom.js';
import { t } from '../i18n/index.js';
import { navigate } from '../lib/navigation.js';
import { setPageTitle } from '../lib/seo.js';
import { errorState } from '../ui/auth-gate.js';
import { emptyState } from '../ui/empty.js';
import { confirmSheet } from '../ui/confirm-sheet.js';
import { openSheet } from '../ui/sheet.js';
import { icon } from '../ui/icons.js';
import { toast } from '../ui/toast.js';

export async function render() {
  document.body.dataset.page = 'admin';
  setPageTitle(t('admin.title'));

  let stats;
  try {
    stats = await api.admin.stats();
  } catch {
    return h(
      'div',
      { class: 'container page' },
      h('h1', { class: 'page-title' }, t('admin.title')),
      h('div', { style: { marginTop: '16px' } }, errorState({ onRetry: () => navigate('/admin') })),
    );
  }

  let reports = [];
  let listings = [];
  let banners = [];
  try {
    [reports, listings, banners] = await Promise.all([
      api.admin.reports(),
      api.admin.listings(),
      api.admin.banners(),
    ]);
  } catch {
    toast.error(t('common.genericError'));
  }

  function statCard(label, value, iconName, tone) {
    return h(
      'article',
      { class: `admin-stat admin-stat--${tone}` },
      h('span', { class: 'admin-stat__icon' }, icon(iconName, { size: 19 })),
      h(
        'div',
        { class: 'admin-stat__body' },
        h('p', { class: 'admin-stat__value' }, String(value)),
        h('p', { class: 'admin-stat__label' }, label),
      ),
    );
  }

  const statsSection = h(
    'section',
    { class: 'admin-stats' },
    statCard(t('admin.statsUsers'), stats.users, 'user', 'users'),
    statCard(t('admin.statsListings'), stats.listings, 'tag', 'listings'),
    statCard(t('admin.statsActive'), stats.activeListings, 'zap', 'active'),
    statCard(t('admin.statsReports'), stats.reports, 'flag', 'reports'),
    statCard(t('admin.statsOpenReports'), stats.openReports, 'alert-circle', 'openReports'),
    statCard(t('admin.statsBoosts'), stats.promotions, 'star', 'boosts'),
  );

  // Reports moderation
  const reportsSection = h(
    'section',
    { class: 'admin-section', style: { marginTop: '28px' } },
    h(
      'div',
      { class: 'admin-section__head' },
      h('h2', { class: 'admin-section__title' }, t('admin.reportsTitle')),
      h('p', { class: 'text-muted' }, t('admin.reportsSubtitle')),
    ),
    reports.length
      ? h(
          'table',
          { class: 'admin-table' },
          h(
            'thead',
            h(
              'tr',
              h('th', t('admin.reportsReporter')),
              h('th', t('admin.reportsReason')),
              h('th', t('admin.reportsStatus')),
              h('th', t('admin.reportsActions')),
            ),
          ),
          h(
            'tbody',
            ...reports.map((report) => {
              const isOpen = report.status === 'open';
              return h(
                'tr',
                { class: 'admin-table__row' },
                h('td', { class: 'admin-table__cell' }, report.reporterName || '—'),
                h('td', { class: 'admin-table__cell' }, report.reason),
                h(
                  'td',
                  { class: 'admin-table__cell' },
                  h(
                    'span',
                    { class: `badge ${isOpen ? 'badge--warning' : 'badge--success'}` },
                    report.status,
                  ),
                ),
                h(
                  'td',
                  { class: 'admin-table__cell' },
                  h(
                    'div',
                    { class: 'admin-actions' },
                    isOpen
                      ? h(
                          'button',
                          {
                            class: 'btn btn--primary btn--sm',
                            type: 'button',
                            onClick: () => resolveReport(report, 'resolved'),
                          },
                          t('admin.resolve'),
                        )
                      : null,
                    isOpen
                      ? h(
                          'button',
                          {
                            class: 'btn btn--secondary btn--sm',
                            type: 'button',
                            onClick: () => resolveReport(report, 'dismissed'),
                          },
                          t('admin.dismiss'),
                        )
                      : null,
                  ),
                ),
              );
            }),
          ),
        )
      : emptyState({
          iconName: 'inbox',
          title: t('admin.noReports'),
          body: t('admin.noReportsBody'),
        }),
  );

  async function resolveReport(report, status) {
    const confirmed = await confirmSheet({
      title: t('admin.resolveReportTitle'),
      body: t('admin.resolveReportBody', { status }),
      confirmLabel: t('admin.resolve'),
      danger: status === 'dismissed',
    });
    if (!confirmed) return;
    try {
      await api.admin.updateReport(report.id, { status });
      toast.success(t('admin.reportUpdated'));
      await refreshData();
    } catch {
      toast.error(t('common.genericError'));
    }
  }

  // Listings moderation
  const listingsSection = h(
    'section',
    { class: 'admin-section', style: { marginTop: '28px' } },
    h(
      'div',
      { class: 'admin-section__head' },
      h('h2', { class: 'admin-section__title' }, t('admin.listingsTitle')),
      h('p', { class: 'text-muted' }, t('admin.listingsSubtitle')),
    ),
    listings.length
      ? h(
          'table',
          { class: 'admin-table' },
          h(
            'thead',
            h(
              'tr',
              h('th', t('admin.listingsTitle')),
              h('th', t('admin.listingsSeller')),
              h('th', t('admin.listingsStatus')),
              h('th', t('admin.listingsViews')),
              h('th', t('admin.listingsContacts')),
              h('th', t('admin.listingsActions')),
            ),
          ),
          h(
            'tbody',
            ...listings.map((listing) => {
              const isActive = listing.status === 'active';
              return h(
                'tr',
                { class: 'admin-table__row' },
                h('td', { class: 'admin-table__cell' }, listing.title),
                h('td', { class: 'admin-table__cell' }, listing.sellerName || '—'),
                h(
                  'td',
                  { class: 'admin-table__cell' },
                  h(
                    'span',
                    { class: `badge ${isActive ? 'badge--success' : 'badge--neutral'}` },
                    listing.status,
                  ),
                ),
                h('td', { class: 'admin-table__cell' }, String(listing.viewsCount)),
                h('td', { class: 'admin-table__cell' }, String(listing.contactsCount)),
                h(
                  'td',
                  { class: 'admin-table__cell' },
                  h(
                    'div',
                    { class: 'admin-actions' },
                    isActive
                      ? h(
                          'button',
                          {
                            class: 'btn btn--danger btn--sm',
                            type: 'button',
                            onClick: () => hideListing(listing),
                          },
                          t('admin.hideListing'),
                        )
                      : null,
                  ),
                ),
              );
            }),
          ),
        )
      : emptyState({
          iconName: 'tag',
          title: t('admin.noListings'),
          body: t('admin.noListingsBody'),
        }),
  );

  async function hideListing(listing) {
    const confirmed = await confirmSheet({
      title: t('admin.hideListingTitle'),
      body: t('admin.hideListingBody', { title: listing.title }),
      confirmLabel: t('admin.hideListing'),
      danger: true,
    });
    if (!confirmed) return;
    try {
      await api.admin.hideListing(listing.id);
      toast.success(t('admin.listingHidden'));
      await refreshData();
    } catch {
      toast.error(t('common.genericError'));
    }
  }

  // Banners management
  const bannersSection = h(
    'section',
    { class: 'admin-section', style: { marginTop: '28px' } },
    h(
      'div',
      { class: 'admin-section__head' },
      h('h2', { class: 'admin-section__title' }, t('admin.bannersTitle')),
      h('p', { class: 'text-muted' }, t('admin.bannersSubtitle')),
      h(
        'button',
        {
          class: 'btn btn--primary',
          type: 'button',
          onClick: () => openBannerForm(),
        },
        icon('plus', { size: 18 }),
        t('admin.addBanner'),
      ),
    ),
    banners.length
      ? h(
          'table',
          { class: 'admin-table' },
          h(
            'thead',
            h(
              'tr',
              h('th', t('admin.bannersTitle')),
              h('th', t('admin.bannersStatus')),
              h('th', t('admin.bannersActions')),
            ),
          ),
          h(
            'tbody',
            ...banners.map((banner) => h(
              'tr',
              { class: 'admin-table__row' },
              h('td', { class: 'admin-table__cell' }, banner.title),
              h(
                'td',
                { class: 'admin-table__cell' },
                h(
                  'span',
                  { class: `badge ${banner.isActive ? 'badge--success' : 'badge--neutral'}` },
                  banner.isActive ? t('admin.active') : t('admin.inactive'),
                ),
              ),
              h(
                'td',
                { class: 'admin-table__cell' },
                h(
                  'div',
                  { class: 'admin-actions' },
                  h(
                    'button',
                    {
                      class: 'btn btn--secondary btn--sm',
                      type: 'button',
                      onClick: () => openBannerForm(banner),
                    },
                    t('admin.edit'),
                  ),
                  h(
                    'button',
                    {
                      class: 'btn btn--danger btn--sm',
                      type: 'button',
                      onClick: () => deleteBanner(banner),
                    },
                    icon('trash-2', { size: 16 }),
                    t('admin.delete'),
                  ),
                ),
              ),
            )),
          ),
        )
      : h(
          'div',
          { class: 'admin-empty' },
          h('p', { class: 'text-muted' }, t('admin.noBanners')),
          h(
            'button',
            {
              class: 'btn btn--primary',
              type: 'button',
              onClick: () => openBannerForm(),
            },
            icon('plus', { size: 18 }),
            t('admin.addBanner'),
          ),
        ),
  );

  async function openBannerForm(banner = null) {
    const titleInput = h('input', {
      class: 'field__input',
      type: 'text',
      id: 'banner-title',
      placeholder: t('admin.bannerTitlePlaceholder'),
      'aria-label': t('admin.bannerTitle'),
      value: banner?.title ?? '',
      maxlength: '120',
    });
    const imageInput = h('input', {
      class: 'field__input',
      type: 'text',
      id: 'banner-image',
      placeholder: t('admin.bannerImagePlaceholder'),
      'aria-label': t('admin.bannerImage'),
      value: banner?.imagePath ?? '',
      maxlength: '500',
    });
    const linkInput = h('input', {
      class: 'field__input',
      type: 'text',
      id: 'banner-link',
      placeholder: t('admin.bannerLinkPlaceholder'),
      'aria-label': t('admin.bannerLink'),
      value: banner?.linkUrl ?? '',
      maxlength: '300',
    });
    const isActiveInput = h('input', {
      class: 'field__input',
      type: 'checkbox',
      id: 'banner-active',
      checked: banner?.isActive !== false,
    });
    const sortOrderInput = h('input', {
      class: 'field__input',
      type: 'text',
      id: 'banner-sort',
      inputMode: 'numeric',
      value: banner?.sortOrder ?? '0',
      maxlength: '3',
    });
    const errorBox = h('div', { role: 'alert' });

    const form = h(
      'form',
      {
        class: 'form',
        onSubmit: async (event) => {
          event.preventDefault();
          errorBox.replaceChildren();
          const title = String(titleInput.value ?? '').trim().slice(0, 120);
          const imagePath = String(imageInput.value ?? '').trim();
          const linkUrl = String(linkInput.value ?? '').trim().slice(0, 300);
          const isActive = isActiveInput.checked;
          const sortOrder = Number(sortOrderInput.value) || 0;
          let submitButton;
          if (!title || !imagePath) {
            errorBox.appendChild(
              h(
                'p',
                { class: 'field__error' },
                icon('alert-circle', { size: 16 }),
                h('span', {}, t('admin.invalidBanner')),
              ),
            );
            return;
          }
          try {
            submitButton = form.querySelector('button[type=submit]');
            submitButton.disabled = true;
            submitButton.textContent = banner ? t('admin.updating') : t('admin.addBanner');
            if (banner) {
              await api.admin.updateBanner(banner.id, {
                title,
                imagePath,
                linkUrl,
                cityId: null,
                startsAt: null,
                endsAt: null,
                isActive,
                sortOrder,
              });
              toast.success(t('admin.bannerUpdated'));
            } else {
              await api.admin.createBanner({
                title,
                imagePath,
                linkUrl,
                cityId: null,
                startsAt: null,
                endsAt: null,
                isActive,
                sortOrder,
              });
              toast.success(t('admin.bannerCreated'));
            }
            handle.close();
            await refreshData();
          } catch {
            toast.error(t('common.genericError'));
          } finally {
            submitButton.disabled = false;
            submitButton.textContent = banner ? t('admin.updating') : t('admin.addBanner');
          }
        },
      },
      h(
        'div',
        { class: 'field' },
        h('label', { class: 'field__label', for: 'banner-title' }, t('admin.bannerTitle')),
        titleInput,
      ),
      h(
        'div',
        { class: 'field' },
        h(
          'label',
          { class: 'field__label', for: 'banner-image' },
          t('admin.bannerImage'),
        ),
        imageInput,
      ),
      h(
        'div',
        { class: 'field' },
        h('label', { class: 'field__label', for: 'banner-link' }, t('admin.bannerLink')),
        linkInput,
      ),
      h(
        'div',
        { class: 'field field--checkbox' },
        h(
          'label',
          { class: 'checkbox', for: 'banner-active' },
          isActiveInput,
          h('span', {}, t('admin.bannerActive')),
        ),
      ),
      h(
        'div',
        { class: 'field' },
        h(
          'label',
          { class: 'field__label', for: 'banner-sort' },
          t('admin.bannerSort'),
        ),
        sortOrderInput,
      ),
      errorBox,
      h(
        'div',
        { class: 'form__actions' },
        h(
          'button',
          { class: 'btn btn--secondary', type: 'button', onClick: () => handle.close() },
          t('common.cancel'),
        ),
        h('button', { class: 'btn btn--primary', type: 'submit' }, banner ? t('admin.updating') : t('admin.addBanner')),
      ),
    );

    const handle = openSheet({
      title: banner ? t('admin.editBanner') : t('admin.addBanner'),
      content: form,
    });
  }

  async function deleteBanner(banner) {
    const confirmed = await confirmSheet({
      title: t('admin.deleteBannerTitle'),
      body: t('admin.deleteBannerBody', { title: banner.title }),
      confirmLabel: t('admin.delete'),
      danger: true,
    });
    if (!confirmed) return;
    try {
      await api.admin.deleteBanner(banner.id);
      toast.success(t('admin.bannerDeleted'));
      await refreshData();
    } catch {
      toast.error(t('common.genericError'));
    }
  }

  async function refreshData() {
    try {
      [stats, reports, listings, banners] = await Promise.all([
        api.admin.stats(),
        api.admin.reports(),
        api.admin.listings(),
        api.admin.banners(),
      ]);
      statsSection.replaceChildren(
        statCard(t('admin.statsUsers'), stats.users, 'user', 'users'),
        statCard(t('admin.statsListings'), stats.listings, 'tag', 'listings'),
        statCard(t('admin.statsActive'), stats.activeListings, 'zap', 'active'),
        statCard(t('admin.statsReports'), stats.reports, 'flag', 'reports'),
        statCard(t('admin.statsOpenReports'), stats.openReports, 'alert-circle', 'openReports'),
        statCard(t('admin.statsBoosts'), stats.promotions, 'star', 'boosts'),
      );
    } catch {
      toast.error(t('common.genericError'));
    }
  }

  return h(
    'div',
    { class: 'container page' },
    h(
      'div',
      { class: 'page-head' },
      h(
        'div',
        {},
        h('h1', { class: 'page-title' }, t('admin.title')),
        h('p', { class: 'text-muted' }, t('admin.subtitle')),
      ),
    ),
    statsSection,
    reportsSection,
    listingsSection,
    bannersSection,
  );
}

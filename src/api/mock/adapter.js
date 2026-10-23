import { ApiError, authRequired, forbidden, notFound } from '../errors.js';
import { matchesQuery } from '../../lib/search.js';
import { createSeed } from './seed.js';
import { placeholderImages } from './placeholder.js';

const seed = createSeed();
const DEMO_USER_ID = '11111111-1111-4111-8111-000000000007';
const LISTING_DAYS = 30;
const MAX_PHOTOS = 5;

const db = {
  categories: seed.categories,
  cities: seed.cities,
  profiles: seed.profiles,
  listings: seed.listings,
  conversations: seed.conversations,
  messages: seed.messages,
  notifications: seed.notifications,
  reports: [],
  reviews: [],
  savedSearches: [],
  wantedPosts: [],
  promotions: [],
  payments: [],
  accountDeletionRequests: [],
  banners: [],
  promotionProducts: [
    {
      id: 'boost-7d',
      code: 'listing_boost_7d',
      name: '7-day listing boost',
      kind: 'listing_boost',
      durationDays: 7,
      priceInr: 49,
      isActive: true,
      sortOrder: 1,
    },
    {
      id: 'dealer-30d',
      code: 'dealer_boost_30d',
      name: '30-day dealer boost',
      kind: 'dealer_boost',
      durationDays: 30,
      priceInr: 199,
      isActive: true,
      sortOrder: 2,
    },
  ],
};

const favouriteSets = new Map([[DEMO_USER_ID, new Set(seed.favouriteIds)]]);
const blockedSets = new Map();
const viewedListings = new Set();

let currentUserId = null;

function wait() {
  const fast = typeof navigator !== 'undefined' && navigator.webdriver;
  const duration = fast ? 18 : 90 + Math.floor(Math.random() * 120);
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

async function respond(work) {
  await wait();
  return work();
}

function nowIso() {
  return new Date().toISOString();
}

function addDays(days) {
  return new Date(Date.now() + days * 86400000).toISOString();
}

function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `pb-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function currentUser() {
  const user = db.profiles.find((profile) => profile.id === currentUserId);
  if (!user) throw authRequired();
  return user;
}

function findProfile(id) {
  return db.profiles.find((profile) => profile.id === id) || null;
}

function findCategory(id) {
  return (
    db.categories.find((category) => category.id === id) ||
    db.categories.find((category) => category.slug === id) ||
    null
  );
}

function findCity(id) {
  return (
    db.cities.find((city) => city.id === id) || db.cities.find((city) => city.slug === id) || null
  );
}

function findListing(id) {
  return db.listings.find((listing) => listing.id === id) || null;
}

function favouritesFor(userId) {
  if (!favouriteSets.has(userId)) favouriteSets.set(userId, new Set());
  return favouriteSets.get(userId);
}

function blocksFor(userId) {
  if (!blockedSets.has(userId)) blockedSets.set(userId, new Set());
  return blockedSets.get(userId);
}

function isBlocked(profileId) {
  if (!currentUserId) return false;
  return blocksFor(currentUserId).has(profileId);
}

function publicProfile(profile) {
  if (!profile) return null;
  return {
    id: profile.id,
    name: profile.name,
    cityId: profile.cityId,
    city: findCity(profile.cityId),
    isVerified: Boolean(profile.isVerified),
    rating: Number(profile.rating) || 0,
    ratingCount: Number(profile.ratingCount) || 0,
    memberSince: profile.memberSince,
    bio: profile.bio || '',
    isAdmin: Boolean(profile.isAdmin),
  };
}

function sessionProfile(profile) {
  return {
    ...publicProfile(profile),
    email: profile.email,
    phone: profile.phone,
  };
}

function sessionPayload() {
  const profile = db.profiles.find((item) => item.id === currentUserId);
  if (!profile) return { status: 'anonymous', user: null, profile: null };
  const user = sessionProfile(profile);
  return { status: 'signedIn', user, profile: user };
}

function effectiveStatus(listing) {
  if (
    listing.status === 'active' &&
    listing.expiresAt &&
    new Date(listing.expiresAt).getTime() < Date.now()
  ) {
    return 'expired';
  }
  return listing.status || 'active';
}

function galleryFor(listing, category) {
  const source = Array.isArray(listing.images) ? listing.images : [];
  const images = source
    .filter((image) => image && typeof image.url === 'string' && image.url)
    .map((image, index) => ({
      url: image.url,
      thumbUrl: image.thumbUrl || image.url,
      alt: image.alt || `${listing.title} — photo ${index + 1}`,
    }));

  if (images.length) return images;
  return placeholderImages(
    { ...listing, category: category || { slug: 'other', nameEn: 'Other' } },
    Math.max(1, Math.min(Number(listing.imageCount) || 1, 5)),
  );
}

function attributesFor(listing) {
  const attributes = {};
  const source = listing?.attributes;
  if (!source || typeof source !== 'object' || Array.isArray(source)) return attributes;
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'boolean') {
      attributes[String(key).slice(0, 40)] = value ? 'Yes' : 'No';
      continue;
    }
    if (typeof value !== 'string' && typeof value !== 'number') continue;
    const text = String(value).replace(/\s+/g, ' ').trim().slice(0, 120);
    if (text) attributes[String(key).slice(0, 40)] = text;
  }
  return attributes;
}

function decorateListing(listing) {
  const category = findCategory(listing.categoryId);
  const city = findCity(listing.cityId);
  const seller = findProfile(listing.sellerId);
  const favourite = currentUserId ? favouritesFor(currentUserId).has(listing.id) : false;

  return {
    ...listing,
    status: effectiveStatus(listing),
    category,
    city,
    seller: publicProfile(seller),
    images: galleryFor(listing, category),
    attributes: attributesFor(listing),
    isFavourite: favourite,
    isMine: Boolean(currentUserId && listing.sellerId === currentUserId),
    isBlockedSeller: isBlocked(listing.sellerId),
  };
}

function compareRows(a, b, sort) {
  if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
  if (sort === 'price_asc') {
    const diff = a.price - b.price;
    if (diff !== 0) return diff;
  } else if (sort === 'price_desc') {
    const diff = b.price - a.price;
    if (diff !== 0) return diff;
  }
  return new Date(b.bumpedAt).getTime() - new Date(a.bumpedAt).getTime();
}

function categoryText(listing) {
  const category = findCategory(listing.categoryId);
  return category ? `${category.nameEn} ${category.nameHi || ''}` : '';
}

function listingHaystack(listing) {
  const seller = findProfile(listing.sellerId);
  const values = Object.values(attributesFor(listing)).join(' ');
  return [
    listing.title,
    listing.description,
    listing.area,
    categoryText(listing),
    values,
    seller ? seller.name : '',
    listing.condition,
  ].join(' ');
}

function visibleListings() {
  return db.listings.filter((listing) => {
    if (effectiveStatus(listing) !== 'active') return false;
    if (isBlocked(listing.sellerId)) return false;
    return true;
  });
}

function sanitizePhotos(photos) {
  if (!Array.isArray(photos)) return [];
  return photos
    .filter((photo) => typeof photo === 'string')
    .filter(
      (photo) => /^data:image\/(png|jpe?g|webp|gif);/i.test(photo) || /^https?:\/\//i.test(photo),
    )
    .slice(0, MAX_PHOTOS);
}

function listingImages(photos, title) {
  if (!photos.length) return null;
  return photos.map((url, index) => ({
    url,
    thumbUrl: url,
    alt: `${title} — photo ${index + 1}`,
  }));
}

function validateListingInput(values) {
  if (!String(values.title ?? '').trim()) {
    throw new ApiError('VALIDATION', 'Add a title for the listing.', 'validation.titleShort');
  }
  if (!findCategory(values.categoryId)) {
    throw new ApiError('VALIDATION', 'Choose a category.', 'validation.category');
  }
  if (!findCity(values.cityId)) {
    throw new ApiError('VALIDATION', 'Choose a city.', 'validation.city');
  }
}

function addNotification(userId, { type, title, body, link }) {
  db.notifications.unshift({
    id: newId(),
    userId,
    type,
    title,
    body,
    link,
    read: false,
    createdAt: nowIso(),
  });
}

function conversationFor(conversation) {
  const listing = findListing(conversation.listingId);
  const otherId =
    conversation.buyerId === currentUserId ? conversation.sellerId : conversation.buyerId;
  const otherUser = findProfile(otherId);
  const messages = db.messages
    .filter((message) => message.conversationId === conversation.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const lastMessage = messages[messages.length - 1] || null;
  const unreadCount = messages.filter(
    (message) => message.senderId !== currentUserId && !message.readAt,
  ).length;

  return {
    ...conversation,
    listing: listing ? decorateListing(listing) : null,
    otherUser: publicProfile(otherUser),
    lastMessage,
    unreadCount,
    isBlocked: otherUser ? isBlocked(otherUser.id) : false,
  };
}

function requireConversation(id) {
  const conversation = db.conversations.find((item) => item.id === id);
  if (!conversation) throw notFound('Conversation not found.');
  if (conversation.buyerId !== currentUserId && conversation.sellerId !== currentUserId) {
    throw notFound('Conversation not found.');
  }
  return conversation;
}

function unreadNotificationCount() {
  if (!currentUserId) return 0;
  return db.notifications.filter((item) => item.userId === currentUserId && !item.read).length;
}

function unreadChatCount() {
  if (!currentUserId) return 0;
  const conversationIds = new Set(
    db.conversations
      .filter((item) => item.buyerId === currentUserId || item.sellerId === currentUserId)
      .map((item) => item.id),
  );
  return db.messages.filter(
    (message) =>
      conversationIds.has(message.conversationId) &&
      message.senderId !== currentUserId &&
      !message.readAt,
  ).length;
}

export function createMockApi() {
  return {
    categories: {
      list() {
        return respond(() =>
          [...db.categories].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
        );
      },
    },

    cities: {
      list() {
        return respond(() => [...db.cities]);
      },
    },

    auth: {
      session() {
        return respond(() => sessionPayload());
      },

      login({ email, password: _password, cityId }) {
        return respond(() => {
          const normalized = String(email ?? '')
            .trim()
            .toLowerCase();
          let profile = db.profiles.find((item) => item.email.toLowerCase() === normalized);

          if (!profile) {
            const local = normalized.split('@')[0] || 'Neighbour';
            const name = local
              .replace(/[._-]+/g, ' ')
              .replace(/\b\w/g, (letter) => letter.toUpperCase())
              .slice(0, 60);
            profile = {
              id: newId(),
              name: name || 'Neighbour',
              email: normalized,
              phone: '',
              cityId: findCity(cityId)?.id || 'city-khargone',
              isVerified: false,
              rating: 0,
              ratingCount: 0,
              memberSince: nowIso(),
              bio: '',
              isAdmin: false,
            };
            db.profiles.push(profile);
          }

          currentUserId = profile.id;
          return sessionPayload();
        });
      },

      signup({ name, email, phone, password: _password, cityId }) {
        return respond(() => {
          const normalized = String(email ?? '')
            .trim()
            .toLowerCase();
          if (db.profiles.some((item) => item.email.toLowerCase() === normalized)) {
            throw new ApiError(
              'EMAIL_TAKEN',
              'An account with this email already exists. Sign in instead.',
              'errors.emailTaken',
            );
          }

          const profile = {
            id: newId(),
            name: String(name ?? '')
              .trim()
              .slice(0, 60),
            email: normalized,
            phone: String(phone ?? '')
              .replace(/\D/g, '')
              .slice(-10),
            cityId: findCity(cityId)?.id || 'city-khargone',
            isVerified: false,
            rating: 0,
            ratingCount: 0,
            memberSince: nowIso(),
            bio: '',
            isAdmin: false,
          };
          db.profiles.push(profile);
          currentUserId = profile.id;
          addNotification(profile.id, {
            type: 'system',
            title: 'Welcome to Purana Bazaar',
            body: 'Buy and sell around your neighbourhood. Start with something you no longer use.',
            link: '/sell',
          });
          return sessionPayload();
        });
      },

      reset(email) {
        return respond(() => ({
          ok: true,
          email: String(email ?? '')
            .trim()
            .toLowerCase(),
        }));
      },

      logout() {
        return respond(() => {
          currentUserId = null;
          return { status: 'anonymous', user: null, profile: null };
        });
      },
    },

    listings: {
      feed(params = {}) {
        return respond(() => {
          const {
            cityId = null,
            categoryId = null,
            q = '',
            minPrice = null,
            maxPrice = null,
            condition = '',
            withPhotos = false,
            sort = 'newest',
            limit = 20,
            cursor = 0,
          } = params;

          let rows = visibleListings();
          if (cityId) rows = rows.filter((listing) => listing.cityId === cityId);
          if (categoryId) rows = rows.filter((listing) => listing.categoryId === categoryId);

          const min = Number(minPrice);
          const max = Number(maxPrice);
          if (Number.isFinite(min) && min > 0)
            rows = rows.filter((listing) => listing.price >= min);
          if (Number.isFinite(max) && max > 0)
            rows = rows.filter((listing) => listing.price <= max);
          if (condition) rows = rows.filter((listing) => listing.condition === condition);
          if (withPhotos) rows = rows.filter((listing) => (Number(listing.imageCount) || 0) > 0);
          if (String(q).trim()) {
            rows = rows.filter((listing) => matchesQuery(listingHaystack(listing), q));
          }

          rows = rows.sort((a, b) => compareRows(a, b, sort));

          const pageSize = Math.min(Math.max(Number(limit) || 20, 1), 40);
          const offset = Math.max(Number(cursor) || 0, 0);
          const total = rows.length;
          const page = rows.slice(offset, offset + pageSize);

          return {
            items: page.map(decorateListing),
            total,
            nextCursor: offset + pageSize < total ? String(offset + pageSize) : null,
          };
        });
      },

      featured({ cityId = null, limit = 8 } = {}) {
        return respond(() => {
          let rows = visibleListings().filter((listing) => listing.isFeatured);
          if (cityId) rows = rows.filter((listing) => listing.cityId === cityId);
          return rows
            .sort((a, b) => new Date(b.bumpedAt).getTime() - new Date(a.bumpedAt).getTime())
            .slice(0, Math.min(Math.max(Number(limit) || 8, 1), 12))
            .map(decorateListing);
        });
      },

      get(id) {
        return respond(() => {
          const listing = findListing(id);
          if (!listing) throw notFound('Listing not found.');
          return decorateListing(listing);
        });
      },

      similar(id, { limit = 6 } = {}) {
        return respond(() => {
          const listing = findListing(id);
          if (!listing) return [];
          return visibleListings()
            .filter((item) => item.id !== id && item.categoryId === listing.categoryId)
            .sort((a, b) => compareRows(a, b, 'newest'))
            .slice(0, Math.min(Math.max(Number(limit) || 6, 1), 12))
            .map(decorateListing);
        });
      },

      view(id) {
        return respond(() => {
          const listing = findListing(id);
          if (!listing) throw notFound('Listing not found.');
          if (!viewedListings.has(id)) {
            viewedListings.add(id);
            listing.viewsCount = (Number(listing.viewsCount) || 0) + 1;
          }
          return { viewsCount: listing.viewsCount };
        });
      },

      contact(id) {
        return respond(() => {
          const user = currentUser();
          const listing = findListing(id);
          if (!listing) throw notFound('Listing not found.');
          if (effectiveStatus(listing) !== 'active') {
            throw new ApiError('LISTING_CLOSED', 'This listing is closed.', 'listing.soldTitle');
          }
          if (isBlocked(listing.sellerId)) {
            throw new ApiError('BLOCKED', 'This seller is blocked.', 'errors.blocked');
          }
          const seller = findProfile(listing.sellerId);
          if (!seller) throw notFound('Seller not found.');
          listing.contactsCount = (Number(listing.contactsCount) || 0) + 1;
          return { phone: seller.phone, name: seller.name, listingId: listing.id, userId: user.id };
        });
      },

      create(values = {}) {
        return respond(() => {
          const user = currentUser();
          validateListingInput(values);
          const photos = sanitizePhotos(values.photos);
          const title = String(values.title ?? '')
            .trim()
            .slice(0, 80);
          const listing = {
            id: newId(),
            title,
            description: String(values.description ?? '')
              .trim()
              .slice(0, 2000),
            price: Math.max(0, Math.round(Number(values.price) || 0)),
            isNegotiable: Boolean(values.isNegotiable),
            categoryId: findCategory(values.categoryId).id,
            cityId: findCity(values.cityId).id,
            area: String(values.area ?? '')
              .trim()
              .slice(0, 60),
            condition: String(values.condition ?? 'good'),
            sellerId: user.id,
            status: 'active',
            isFeatured: false,
            viewsCount: 0,
            contactsCount: 0,
            createdAt: nowIso(),
            bumpedAt: nowIso(),
            expiresAt: addDays(LISTING_DAYS),
            attributes: attributesFor({ attributes: values.attributes }),
            imageCount: Math.max(photos.length, 1),
            images: listingImages(photos, title),
            variant: Math.floor(Math.random() * 20),
          };
          db.listings.unshift(listing);
          return decorateListing(listing);
        });
      },

      update(id, values = {}) {
        return respond(() => {
          const user = currentUser();
          const listing = findListing(id);
          if (!listing) throw notFound('Listing not found.');
          if (listing.sellerId !== user.id) {
            throw forbidden('You can only edit your own listings.');
          }
          validateListingInput({ ...listing, ...values });

          if (values.title !== undefined) listing.title = String(values.title).trim().slice(0, 80);
          if (values.description !== undefined) {
            listing.description = String(values.description).trim().slice(0, 2000);
          }
          if (values.price !== undefined)
            listing.price = Math.max(0, Math.round(Number(values.price) || 0));
          if (values.isNegotiable !== undefined)
            listing.isNegotiable = Boolean(values.isNegotiable);
          if (values.categoryId !== undefined)
            listing.categoryId = findCategory(values.categoryId).id;
          if (values.cityId !== undefined) listing.cityId = findCity(values.cityId).id;
          if (values.area !== undefined) listing.area = String(values.area).trim().slice(0, 60);
          if (values.condition !== undefined) listing.condition = String(values.condition);
          if (values.attributes !== undefined)
            listing.attributes = attributesFor({ attributes: values.attributes });
          if (values.photos !== undefined) {
            const photos = sanitizePhotos(values.photos);
            listing.images = listingImages(photos, listing.title);
            listing.imageCount = Math.max(photos.length, 1);
          }

          return decorateListing(listing);
        });
      },

      remove(id) {
        return respond(() => {
          const user = currentUser();
          const listing = findListing(id);
          if (!listing) throw notFound('Listing not found.');
          if (listing.sellerId !== user.id) {
            throw forbidden('You can only delete your own listings.');
          }

          const conversationIds = new Set(
            db.conversations.filter((item) => item.listingId === id).map((item) => item.id),
          );
          db.listings = db.listings.filter((item) => item.id !== id);
          db.conversations = db.conversations.filter((item) => item.listingId !== id);
          db.messages = db.messages.filter((item) => !conversationIds.has(item.conversationId));
          db.notifications = db.notifications.filter(
            (item) => !String(item.link || '').includes(`/l/${id}`),
          );
          return { ok: true };
        });
      },

      markSold(id) {
        return respond(() => {
          const user = currentUser();
          const listing = findListing(id);
          if (!listing) throw notFound('Listing not found.');
          if (listing.sellerId !== user.id)
            throw forbidden('You can only change your own listings.');
          listing.status = 'sold';
          listing.closedAt = nowIso();
          return decorateListing(listing);
        });
      },

      renew(id) {
        return respond(() => {
          const user = currentUser();
          const listing = findListing(id);
          if (!listing) throw notFound('Listing not found.');
          if (listing.sellerId !== user.id)
            throw forbidden('You can only change your own listings.');
          if (effectiveStatus(listing) === 'sold') {
            throw forbidden('Sold listings cannot be renewed.');
          }
          listing.status = 'active';
          listing.bumpedAt = nowIso();
          listing.expiresAt = addDays(LISTING_DAYS);
          return decorateListing(listing);
        });
      },

      my() {
        return respond(() => {
          const user = currentUser();
          return db.listings
            .filter((listing) => listing.sellerId === user.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map(decorateListing);
        });
      },
    },

    favourites: {
      ids() {
        return respond(() => {
          if (!currentUserId) return [];
          return Array.from(favouritesFor(currentUserId));
        });
      },

      list() {
        return respond(() => {
          if (!currentUserId) throw authRequired();
          const ids = favouritesFor(currentUserId);
          return db.listings
            .filter((listing) => ids.has(listing.id))
            .sort((a, b) => new Date(b.bumpedAt).getTime() - new Date(a.bumpedAt).getTime())
            .map(decorateListing);
        });
      },

      toggle(id) {
        return respond(() => {
          if (!currentUserId) throw authRequired();
          const listing = findListing(id);
          if (!listing) throw notFound('Listing not found.');
          const ids = favouritesFor(currentUserId);
          if (ids.has(id)) ids.delete(id);
          else ids.add(id);
          return { saved: ids.has(id), ids: Array.from(ids) };
        });
      },
    },

    chats: {
      list() {
        return respond(() => {
          if (!currentUserId) throw authRequired();
          return db.conversations
            .filter((item) => item.buyerId === currentUserId || item.sellerId === currentUserId)
            .sort(
              (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
            )
            .map(conversationFor);
        });
      },

      get(id) {
        return respond(() => {
          if (!currentUserId) throw authRequired();
          const conversation = requireConversation(id);
          return {
            conversation: conversationFor(conversation),
            messages: db.messages
              .filter((message) => message.conversationId === conversation.id)
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
              .map((message) => ({ ...message, isMine: message.senderId === currentUserId })),
          };
        });
      },

      start(listingId) {
        return respond(() => {
          const user = currentUser();
          const listing = findListing(listingId);
          if (!listing) throw notFound('Listing not found.');
          if (listing.sellerId === user.id) {
            throw forbidden('This is your own listing.');
          }
          if (effectiveStatus(listing) !== 'active') {
            throw new ApiError('LISTING_CLOSED', 'This listing is closed.', 'listing.soldTitle');
          }
          if (isBlocked(listing.sellerId)) {
            throw new ApiError('BLOCKED', 'This seller is blocked.', 'errors.blocked');
          }

          const existing = db.conversations.find(
            (item) => item.listingId === listing.id && item.buyerId === user.id,
          );
          if (existing) return { id: existing.id, created: false };

          const conversation = {
            id: newId(),
            listingId: listing.id,
            buyerId: user.id,
            sellerId: listing.sellerId,
            createdAt: nowIso(),
            lastMessageAt: nowIso(),
          };
          db.conversations.unshift(conversation);
          return { id: conversation.id, created: true };
        });
      },

      send(id, body) {
        return respond(() => {
          const user = currentUser();
          const conversation = requireConversation(id);
          const listing = findListing(conversation.listingId);
          if (!listing) throw notFound('Listing not found.');
          if (effectiveStatus(listing) !== 'active') {
            throw new ApiError('LISTING_CLOSED', 'This listing is closed.', 'listing.soldTitle');
          }
          if (
            isBlocked(
              user.id === conversation.buyerId ? conversation.sellerId : conversation.buyerId,
            )
          ) {
            throw new ApiError('BLOCKED', 'This seller is blocked.', 'errors.blocked');
          }

          const text = String(body ?? '')
            .trim()
            .slice(0, 1000);
          if (!text)
            throw new ApiError(
              'EMPTY_MESSAGE',
              'Write a message first.',
              'validation.messageRequired',
            );

          const message = {
            id: newId(),
            conversationId: id,
            senderId: user.id,
            body: text,
            createdAt: nowIso(),
            readAt: null,
          };
          db.messages.push(message);
          conversation.lastMessageAt = message.createdAt;

          const recipientId =
            conversation.buyerId === user.id ? conversation.sellerId : conversation.buyerId;
          addNotification(recipientId, {
            type: 'message',
            title: `New message from ${user.name}`,
            body: text.slice(0, 120),
            link: `/chat/${id}`,
          });

          return { ...message, isMine: true };
        });
      },

      markRead(id) {
        return respond(() => {
          if (!currentUserId) throw authRequired();
          requireConversation(id);
          let marked = 0;
          for (const message of db.messages) {
            if (
              message.conversationId === id &&
              message.senderId !== currentUserId &&
              !message.readAt
            ) {
              message.readAt = nowIso();
              marked += 1;
            }
          }
          return { marked };
        });
      },

      unread() {
        return respond(() => ({ count: unreadChatCount() }));
      },
    },

    notifications: {
      list() {
        return respond(() => {
          if (!currentUserId) throw authRequired();
          return db.notifications
            .filter((item) => item.userId === currentUserId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((item) => ({ ...item, isUnread: !item.read }));
        });
      },

      unread() {
        return respond(() => ({ count: unreadNotificationCount() }));
      },

      markAllRead() {
        return respond(() => {
          if (!currentUserId) throw authRequired();
          let marked = 0;
          for (const item of db.notifications) {
            if (item.userId === currentUserId && !item.read) {
              item.read = true;
              marked += 1;
            }
          }
          return { marked, count: 0 };
        });
      },

      markRead(id) {
        return respond(() => {
          if (!currentUserId) throw authRequired();
          const item = db.notifications.find(
            (notification) => notification.id === id && notification.userId === currentUserId,
          );
          if (!item) throw notFound('Notification not found.');
          item.read = true;
          return { count: unreadNotificationCount() };
        });
      },
    },

    sellers: {
      get(id) {
        return respond(() => {
          const profile = findProfile(id);
          if (!profile) throw notFound('Seller not found.');
          const listings = db.listings.filter((listing) => listing.sellerId === id);
          return {
            seller: publicProfile(profile),
            activeCount: listings.filter((listing) => effectiveStatus(listing) === 'active').length,
            soldCount: listings.filter((listing) => effectiveStatus(listing) === 'sold').length,
            isBlocked: isBlocked(id),
          };
        });
      },

      listings(id) {
        return respond(() => {
          if (isBlocked(id)) return [];
          return db.listings
            .filter((listing) => listing.sellerId === id && effectiveStatus(listing) === 'active')
            .sort((a, b) => compareRows(a, b, 'newest'))
            .map(decorateListing);
        });
      },
    },

    blocks: {
      list() {
        return respond(() => {
          if (!currentUserId) return [];
          return Array.from(blocksFor(currentUserId));
        });
      },

      toggle(sellerId) {
        return respond(() => {
          const user = currentUser();
          if (sellerId === user.id) throw forbidden('You cannot block yourself.');
          if (!findProfile(sellerId)) throw notFound('Seller not found.');
          const blocks = blocksFor(user.id);
          if (blocks.has(sellerId)) blocks.delete(sellerId);
          else blocks.add(sellerId);
          return { blocked: blocks.has(sellerId) };
        });
      },
    },

    reports: {
      create(values = {}) {
        return respond(() => {
          const user = currentUser();
          const reason = String(values.reason ?? '').trim();
          if (!reason) {
            throw new ApiError('VALIDATION', 'Choose a reason.', 'validation.reportReason');
          }
          const report = {
            id: newId(),
            reporterId: user.id,
            targetListingId: values.listingId || null,
            targetUserId: values.userId || null,
            reason,
            details: String(values.details ?? '')
              .trim()
              .slice(0, 500),
            status: 'open',
            createdAt: nowIso(),
          };
          db.reports.push(report);
          return { ok: true, id: report.id };
        });
      },
    },

    reviews: {
      list({ listingId, sellerId }) {
        return respond(() => {
          if (sellerId) {
            const seller = db.profiles.find((item) => item.id === sellerId);
            if (!seller) throw notFound('Seller not found.');
          }
          let items = db.reviews;
          if (listingId) items = items.filter((item) => item.listingId === listingId);
          if (sellerId) items = items.filter((item) => item.sellerId === sellerId);
          return items
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((item) => {
              const reviewer = db.profiles.find((p) => p.id === item.reviewerId);
              return {
                id: item.id,
                reviewerId: item.reviewerId,
                reviewerName: reviewer ? reviewer.name : '',
                listingId: item.listingId,
                sellerId: item.sellerId,
                rating: item.rating,
                body: item.body,
                createdAt: item.createdAt,
              };
            });
        });
      },

      create(values) {
        return respond(() => {
          const user = currentUser();
          const seller = db.profiles.find((item) => item.id === values.sellerId);
          if (!seller) throw notFound('Seller not found.');
          if (user.id === seller.id) {
            throw new ApiError(
              'NOT_YOURSELF',
              "You can't review your own profile.",
              'reviews.notYourself',
            );
          }
          const already = db.reviews.some(
            (item) => item.listingId === values.listingId && item.reviewerId === user.id,
          );
          if (already) {
            throw new ApiError(
              'ALREADY_REVIEWED',
              "You've already reviewed this seller.",
              'reviews.alreadyReviewed',
            );
          }
          const rating = Number(values.rating);
          if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            throw new ApiError(
              'INVALID_RATING',
              'Rating must be between 1 and 5.',
              'reviews.invalidRating',
            );
          }
          const body = String(values.body ?? '')
            .trim()
            .slice(0, 1000);
          const review = {
            id: newId(),
            reviewerId: user.id,
            listingId: values.listingId,
            sellerId: values.sellerId,
            rating,
            body,
            createdAt: nowIso(),
          };
          db.reviews.push(review);
          return { ...review, reviewerName: user.name };
        });
      },
    },

    savedSearches: {
      list() {
        return respond(() => {
          const user = currentUser();
          return db.savedSearches
            .filter((item) => item.userId === user.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        });
      },

      create(values) {
        return respond(() => {
          const user = currentUser();
          const name = String(values.name ?? '')
            .trim()
            .slice(0, 80);
          if (!name) {
            throw new ApiError(
              'INVALID_NAME',
              'Give your search a name.',
              'savedSearches.invalidName',
            );
          }
          const query = values.query && typeof values.query === 'object' ? values.query : {};
          const item = {
            id: newId(),
            userId: user.id,
            name,
            query,
            notify: values.notify !== false,
            createdAt: nowIso(),
          };
          db.savedSearches.push(item);
          return item;
        });
      },

      update(id, values) {
        return respond(() => {
          const user = currentUser();
          const item = db.savedSearches.find((item) => item.id === id && item.userId === user.id);
          if (!item) throw notFound('Saved search not found.');
          if (values.name !== undefined) {
            const name = String(values.name).trim().slice(0, 80);
            if (!name) {
              throw new ApiError(
                'INVALID_NAME',
                'Give your search a name.',
                'savedSearches.invalidName',
              );
            }
            item.name = name;
          }
          if (values.query !== undefined) item.query = values.query;
          if (values.notify !== undefined) item.notify = values.notify;
          return item;
        });
      },

      delete(id) {
        return respond(() => {
          const user = currentUser();
          const index = db.savedSearches.findIndex(
            (item) => item.id === id && item.userId === user.id,
          );
          if (index === -1) throw notFound('Saved search not found.');
          db.savedSearches.splice(index, 1);
          return { ok: true };
        });
      },
    },

    wantedPosts: {
      list() {
        return respond(() => {
          return db.wantedPosts
            .filter((item) => item.status === 'open')
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((item) => {
              const poster = findProfile(item.userId);
              return {
                id: item.id,
                userId: item.userId,
                posterName: poster ? poster.name : '',
                cityId: item.cityId,
                categoryId: item.categoryId,
                title: item.title,
                description: item.description,
                budget: item.budget,
                status: item.status,
                createdAt: item.createdAt,
                expiresAt: item.expiresAt,
              };
            });
        });
      },

      create(values) {
        return respond(() => {
          const user = currentUser();
          const title = String(values.title ?? '')
            .trim()
            .slice(0, 80);
          if (!title) {
            throw new ApiError('INVALID_TITLE', 'Add a title.', 'wantedPosts.invalidTitle');
          }
          const description = String(values.description ?? '')
            .trim()
            .slice(0, 1000);
          const budget =
            values.budget === null || values.budget === undefined ? null : Number(values.budget);
          if (budget !== null && (!Number.isInteger(budget) || budget < 0)) {
            throw new ApiError(
              'INVALID_BUDGET',
              'Enter a valid budget.',
              'wantedPosts.invalidBudget',
            );
          }
          const item = {
            id: newId(),
            userId: user.id,
            cityId: values.cityId || null,
            categoryId: values.categoryId || null,
            title,
            description,
            budget,
            status: 'open',
            createdAt: nowIso(),
            updatedAt: nowIso(),
            expiresAt: addDays(30),
          };
          db.wantedPosts.push(item);
          return item;
        });
      },

      update(id, values) {
        return respond(() => {
          const user = currentUser();
          const item = db.wantedPosts.find((item) => item.id === id && item.userId === user.id);
          if (!item) throw notFound('Wanted post not found.');
          if (values.title !== undefined) {
            const title = String(values.title).trim().slice(0, 80);
            if (!title) {
              throw new ApiError('INVALID_TITLE', 'Add a title.', 'wantedPosts.invalidTitle');
            }
            item.title = title;
          }
          if (values.description !== undefined)
            item.description = String(values.description).slice(0, 1000);
          if (values.cityId !== undefined) item.cityId = values.cityId;
          if (values.categoryId !== undefined) item.categoryId = values.categoryId;
          if (values.budget !== undefined) {
            const budget =
              values.budget === null || values.budget === undefined ? null : Number(values.budget);
            if (budget !== null && (!Number.isInteger(budget) || budget < 0)) {
              throw new ApiError(
                'INVALID_BUDGET',
                'Enter a valid budget.',
                'wantedPosts.invalidBudget',
              );
            }
            item.budget = budget;
          }
          if (values.status !== undefined) item.status = values.status;
          item.updatedAt = nowIso();
          return item;
        });
      },

      delete(id) {
        return respond(() => {
          const user = currentUser();
          const index = db.wantedPosts.findIndex(
            (item) => item.id === id && item.userId === user.id,
          );
          if (index === -1) throw notFound('Wanted post not found.');
          db.wantedPosts.splice(index, 1);
          return { ok: true };
        });
      },
    },

    promotions: {
      list() {
        return respond(() => {
          const user = currentUser();
          return db.promotions
            .filter((item) => item.userId === user.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((item) => {
              const product = db.promotionProducts.find((p) => p.id === item.productId);
              return {
                id: item.id,
                userId: item.userId,
                listingId: item.listingId,
                productId: item.productId,
                productName: product ? product.name : '',
                durationDays: product ? product.durationDays : 0,
                priceInr: product ? product.priceInr : 0,
                paymentId: item.paymentId,
                status: item.status,
                startsAt: item.startsAt,
                expiresAt: item.expiresAt,
                createdAt: item.createdAt,
              };
            });
        });
      },

      create(values) {
        return respond(() => {
          const user = currentUser();
          const listing = db.listings.find((item) => item.id === values.listingId);
          if (!listing) throw notFound('Listing not found.');
          if (listing.sellerId !== user.id) {
            throw new ApiError(
              'NOT_OWNER',
              'You can only boost your own listings.',
              'promotions.notOwner',
            );
          }
          const product = db.promotionProducts.find(
            (item) => item.id === values.productId && item.isActive,
          );
          if (!product) throw notFound('Boost product not found.');
          const existing = db.promotions.some(
            (item) =>
              item.listingId === values.listingId &&
              item.status === 'active' &&
              new Date(item.expiresAt) > new Date(),
          );
          if (existing) {
            throw new ApiError(
              'ALREADY_BOOSTED',
              'This listing already has an active boost.',
              'promotions.alreadyBoosted',
            );
          }

          // Create a payment record (mock: immediately successful in demo mode).
          const payment = {
            id: newId(),
            userId: user.id,
            provider: 'razorpay',
            providerOrderId: `mock_${newId()}`,
            providerPaymentId: `mock_pay_${newId()}`,
            amountInr: product.priceInr,
            currency: 'INR',
            status: 'paid',
            rawPayload: { mock: true },
            createdAt: nowIso(),
          };
          db.payments.push(payment);

          const promotion = {
            id: newId(),
            userId: user.id,
            listingId: values.listingId,
            productId: product.id,
            paymentId: payment.id,
            status: 'active',
            startsAt: nowIso(),
            expiresAt: addDays(product.durationDays),
            createdAt: nowIso(),
          };
          db.promotions.push(promotion);

          // Mark the listing as featured while the boost is active.
          listing.isFeatured = true;

          return {
            id: promotion.id,
            listingId: promotion.listingId,
            productId: promotion.productId,
            paymentId: promotion.paymentId,
            status: promotion.status,
            startsAt: promotion.startsAt,
            expiresAt: promotion.expiresAt,
            createdAt: promotion.createdAt,
          };
        });
      },
    },

    payments: {
      list() {
        return respond(() => {
          const user = currentUser();
          return db.payments
            .filter((item) => item.userId === user.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        });
      },

      create(values) {
        return respond(() => {
          const user = currentUser();
          const product = db.promotionProducts.find(
            (item) => item.id === values.productId && item.isActive,
          );
          if (!product) throw notFound('Boost product not found.');
          const payment = {
            id: newId(),
            userId: user.id,
            provider: 'razorpay',
            providerOrderId: `mock_${newId()}`,
            providerPaymentId: null,
            amountInr: product.priceInr,
            currency: 'INR',
            status: 'created',
            rawPayload: { mock: true },
            createdAt: nowIso(),
          };
          db.payments.push(payment);
          return {
            id: payment.id,
            providerOrderId: payment.providerOrderId,
            amountInr: payment.amountInr,
            currency: payment.currency,
            status: payment.status,
            createdAt: payment.createdAt,
          };
        });
      },
    },

    accountDeletionRequests: {
      list() {
        return respond(() => {
          const user = currentUser();
          return db.accountDeletionRequests
            .filter((item) => item.userId === user.id)
            .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
        });
      },

      create(values) {
        return respond(() => {
          const user = currentUser();
          const existing = db.accountDeletionRequests.some(
            (item) => item.userId === user.id && item.status === 'pending',
          );
          if (existing) {
            throw new ApiError(
              'PENDING_DELETION',
              'You already have a pending deletion request.',
              'accountDeletionRequests.pendingDeletion',
            );
          }
          const item = {
            id: newId(),
            userId: user.id,
            reason: String(values.reason ?? '').trim().slice(0, 500),
            status: 'pending',
            requestedAt: nowIso(),
          };
          db.accountDeletionRequests.push(item);
          return { id: item.id, status: item.status, requestedAt: item.requestedAt };
        });
      },

      cancel(id) {
        return respond(() => {
          const user = currentUser();
          const item = db.accountDeletionRequests.find(
            (item) => item.id === id && item.userId === user.id,
          );
          if (!item) throw notFound('Deletion request not found.');
          if (item.status !== 'pending') {
            throw new ApiError(
              'CANNOT_CANCEL',
              'Only pending requests can be cancelled.',
              'accountDeletionRequests.cannotCancel',
            );
          }
          item.status = 'cancelled';
          return { id: item.id, status: item.status };
        });
      },
    },

    admin: {
      stats() {
        return respond(() => {
          const user = currentUser();
          if (!user.isAdmin) throw forbidden('Admin only.');
          return {
            users: db.profiles.length,
            listings: db.listings.length,
            activeListings: db.listings.filter(
              (item) => item.status === 'active',
            ).length,
            reports: db.reports.length,
            openReports: db.reports.filter((item) => item.status === 'open').length,
            promotions: db.promotions.length,
            payments: db.payments.length,
          };
        });
      },

      reports() {
        return respond(() => {
          const user = currentUser();
          if (!user.isAdmin) throw forbidden('Admin only.');
          return db.reports
            .map((item) => {
              const reporter = findProfile(item.reporterId);
              return {
                id: item.id,
                reporterId: item.reporterId,
                reporterName: reporter ? reporter.name : '',
                targetListingId: item.targetListingId,
                targetUserId: item.targetUserId,
                reason: item.reason,
                status: item.status,
                details: item.details,
                createdAt: item.createdAt,
              };
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        });
      },

      updateReport(id, values) {
        return respond(() => {
          const user = currentUser();
          if (!user.isAdmin) throw forbidden('Admin only.');
          const item = db.reports.find((item) => item.id === id);
          if (!item) throw notFound('Report not found.');
          if (values.status !== undefined) item.status = values.status;
          if (values.reviewedAt !== undefined) item.reviewedAt = values.reviewedAt;
          if (values.reviewedBy !== undefined) item.reviewedBy = values.reviewedBy;
          if (values.resolution !== undefined) item.resolution = values.resolution;
          return item;
        });
      },

      listings() {
        return respond(() => {
          const user = currentUser();
          if (!user.isAdmin) throw forbidden('Admin only.');
          return db.listings
            .map((item) => {
              const seller = findProfile(item.sellerId);
              return {
                id: item.id,
                title: item.title,
                sellerId: item.sellerId,
                sellerName: seller ? seller.name : '',
                status: item.status,
                isFeatured: item.isFeatured,
                viewsCount: item.viewsCount,
                contactsCount: item.contactsCount,
                createdAt: item.createdAt,
                expiresAt: item.expiresAt,
              };
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        });
      },

      hideListing(id) {
        return respond(() => {
          const user = currentUser();
          if (!user.isAdmin) throw forbidden('Admin only.');
          const item = db.listings.find((item) => item.id === id);
          if (!item) throw notFound('Listing not found.');
          item.status = 'hidden';
          item.closedAt = nowIso();
          return { id: item.id, status: item.status };
        });
      },

      banners() {
        return respond(() => {
          const user = currentUser();
          if (!user.isAdmin) throw forbidden('Admin only.');
          return db.banners
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => ({
              id: item.id,
              title: item.title,
              imagePath: item.imagePath,
              linkUrl: item.linkUrl,
              cityId: item.cityId,
              startsAt: item.startsAt,
              endsAt: item.endsAt,
              isActive: item.isActive,
              sortOrder: item.sortOrder,
            }));
        });
      },

      createBanner(values) {
        return respond(() => {
          const user = currentUser();
          if (!user.isAdmin) throw forbidden('Admin only.');
          const item = {
            id: newId(),
            title: String(values.title ?? '').trim().slice(0, 120),
            imagePath: String(values.imagePath ?? '').trim(),
            linkUrl: String(values.linkUrl ?? '').trim().slice(0, 300),
            cityId: values.cityId || null,
            startsAt: values.startsAt || null,
            endsAt: values.endsAt || null,
            isActive: values.isActive !== false,
            sortOrder: Number(values.sortOrder) || 0,
            createdAt: nowIso(),
          };
          if (!item.title || !item.imagePath) {
            throw new ApiError(
              'INVALID_BANNER',
              'Banner title and image are required.',
              'admin.invalidBanner',
            );
          }
          db.banners.push(item);
          return item;
        });
      },

      updateBanner(id, values) {
        return respond(() => {
          const user = currentUser();
          if (!user.isAdmin) throw forbidden('Admin only.');
          const item = db.banners.find((item) => item.id === id);
          if (!item) throw notFound('Banner not found.');
          if (values.title !== undefined) item.title = String(values.title).trim().slice(0, 120);
          if (values.imagePath !== undefined) item.imagePath = String(values.imagePath).trim();
          if (values.linkUrl !== undefined)
            item.linkUrl = String(values.linkUrl).trim().slice(0, 300);
          if (values.cityId !== undefined) item.cityId = values.cityId;
          if (values.startsAt !== undefined) item.startsAt = values.startsAt;
          if (values.endsAt !== undefined) item.endsAt = values.endsAt;
          if (values.isActive !== undefined) item.isActive = values.isActive;
          if (values.sortOrder !== undefined) item.sortOrder = Number(values.sortOrder) || 0;
          return item;
        });
      },

      deleteBanner(id) {
        return respond(() => {
          const user = currentUser();
          if (!user.isAdmin) throw forbidden('Admin only.');
          const index = db.banners.findIndex((item) => item.id === id);
          if (index === -1) throw notFound('Banner not found.');
          db.banners.splice(index, 1);
          return { ok: true };
        });
      },
    },

    meta: {
      counts() {
        return respond(() => ({
          cities: db.cities.length,
          categories: db.categories.length,
          listings: db.listings.length,
          profiles: db.profiles.length,
        }));
      },
    },
  };
}

export const createApi = createMockApi;

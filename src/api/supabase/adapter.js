import { ApiError, authRequired, forbidden, notFound } from '../errors.js';
import { fallbackImages } from '../mock/photos.js';
import { supabase } from './client.js';

const MAX_PHOTOS = 5;
const MAX_IMAGE_BYTES = 1024 * 1024;
const IMAGE_BUCKET = 'listing-images';

const ANONYMOUS = Object.freeze({ status: 'anonymous', user: null, profile: null });

function anonymous() {
  return { ...ANONYMOUS };
}

function toApiError(error, fallbackKey = 'errors.generic') {
  if (error instanceof ApiError) return error;

  const message = String(error?.message || '');
  const lower = message.toLowerCase();

  if (
    error?.status === 0 ||
    error?.name === 'TypeError' ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror')
  ) {
    return new ApiError('NETWORK', message || 'Network request failed.', 'errors.network');
  }

  if (lower.includes('auth_required')) return authRequired();
  if (
    lower.includes('listing_not_found') ||
    lower.includes('conversation_not_found') ||
    lower.includes('notification_not_found') ||
    lower.includes('seller_not_found')
  ) {
    return notFound();
  }
  if (
    lower.includes('forbidden') ||
    lower.includes('row-level security') ||
    lower.includes('own_listing') ||
    lower.includes('cannot_block_self')
  ) {
    return forbidden(message);
  }
  if (lower.includes('listing_closed')) {
    return new ApiError('LISTING_CLOSED', message, 'listing.soldTitle');
  }
  if (lower.includes('blocked')) {
    return new ApiError('BLOCKED', message, 'errors.blocked');
  }
  if (lower.includes('empty_message')) {
    return new ApiError('EMPTY_MESSAGE', message, 'validation.messageRequired');
  }
  if (lower.includes('report_reason') || lower.includes('report_target')) {
    return new ApiError('VALIDATION', message, 'validation.reportReason');
  }
  if (lower.includes('too_many_images')) {
    return new ApiError('VALIDATION', message, 'errors.tooManyPhotos');
  }
  if (lower.includes('image')) {
    return new ApiError('IMAGE_UPLOAD', message, 'errors.imageUpload');
  }
  if (lower.includes('password should be at least') || lower.includes('password is too short')) {
    return new ApiError('WEAK_PASSWORD', message, 'validation.passwordShort');
  }
  if (lower.includes('invalid login credentials')) {
    return new ApiError('LOGIN_FAILED', message, 'errors.loginFailed');
  }
  if (lower.includes('email not confirmed')) {
    return new ApiError('EMAIL_NOT_CONFIRMED', message, 'errors.confirmEmail');
  }
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return new ApiError('EMAIL_TAKEN', message, 'errors.emailTaken');
  }
  if (error?.code === 'PGRST301' || lower.includes('jwt expired')) {
    return new ApiError('NO_SESSION', message, 'errors.noSession');
  }
  if (error?.code === '23505') {
    return new ApiError('CONFLICT', message, fallbackKey);
  }

  return new ApiError(error?.code || 'GENERIC', message || 'Something went wrong.', fallbackKey);
}

async function currentUserId() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user?.id) throw authRequired();
  return session.user.id;
}

async function readProfile() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase.rpc('get_my_profile');
  if (error) {
    if (error.code === 'PGRST301' || /jwt/i.test(String(error.message))) {
      await supabase.auth.signOut();
    }
    return null;
  }

  if (!data) {
    await supabase.auth.signOut();
    return null;
  }

  return data;
}

async function signedInPayload(profile) {
  if (!profile) throw new ApiError('NO_SESSION', 'Session expired.', 'errors.noSession');
  return { status: 'signedIn', user: profile, profile };
}

function publicImageUrl(path) {
  if (!path) return '';
  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return data?.publicUrl || '';
}

function attributesFor(attributes) {
  const result = {};
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) return result;
  for (const [key, value] of Object.entries(attributes)) {
    if (typeof value === 'boolean') {
      result[String(key).slice(0, 40)] = value ? 'Yes' : 'No';
      continue;
    }
    if (typeof value !== 'string' && typeof value !== 'number') continue;
    const text = String(value).replace(/\s+/g, ' ').trim().slice(0, 120);
    if (text) result[String(key).slice(0, 40)] = text;
  }
  return result;
}

function galleryFor(listing) {
  const source = Array.isArray(listing.images) ? listing.images : [];
  const images = source
    .filter((image) => image && typeof image.path === 'string' && image.path)
    .map((image, index) => {
      const url = publicImageUrl(image.path);
      return {
        url,
        thumbUrl: url,
        alt: image.alt || `${listing.title} — photo ${index + 1}`,
        path: image.path,
      };
    });

  if (images.length) return images;

  return fallbackImages({
    ...listing,
    category: listing.category || { slug: 'other', nameEn: 'Other' },
  });
}

function decorateListing(listing) {
  if (!listing) return null;
  const images = galleryFor(listing);
  return {
    ...listing,
    status: listing.status || 'active',
    seller: listing.seller || null,
    category: listing.category || null,
    city: listing.city || null,
    images,
    imageCount: images.length,
    attributes: attributesFor(listing.attributes),
    isFavourite: Boolean(listing.isFavourite),
    isMine: Boolean(listing.isMine),
    isBlockedSeller: Boolean(listing.isBlockedSeller),
    isFeatured: Boolean(listing.is_featured),
  };
}

function decorateList(items) {
  return Array.isArray(items) ? items.map(decorateListing).filter(Boolean) : [];
}

function decorateConversation(conversation) {
  if (!conversation) return null;
  return {
    ...conversation,
    listing: conversation.listing ? decorateListing(conversation.listing) : null,
    unreadCount: Number(conversation.unreadCount) || 0,
    isBlocked: Boolean(conversation.isBlocked),
  };
}

function decorateChat(data) {
  if (!data) return null;
  return {
    conversation: decorateConversation(data.conversation),
    messages: Array.isArray(data.messages) ? data.messages : [],
  };
}

function listingPayload(values) {
  return {
    title: String(values.title ?? '')
      .trim()
      .slice(0, 80),
    description: String(values.description ?? '')
      .trim()
      .slice(0, 2000),
    price: Math.max(0, Math.round(Number(values.price) || 0)),
    is_negotiable: Boolean(values.isNegotiable),
    category_id: values.categoryId,
    city_id: values.cityId,
    area: String(values.area ?? '')
      .trim()
      .slice(0, 60),
    condition: String(values.condition ?? 'good'),
    attributes: attributesFor(values.attributes),
  };
}

function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image.'));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

async function compressImage(blob) {
  if (blob.type === 'image/gif') {
    if (blob.size > MAX_IMAGE_BYTES) {
      throw new ApiError('IMAGE_TOO_LARGE', 'Image is too large.', 'errors.imageTooLarge');
    }
    return blob;
  }

  const image = await loadImage(blob);
  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d');
  if (!context) return blob;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  let result = await canvasToBlob(canvas, 'image/webp', 0.82);
  if (!result || result.size > MAX_IMAGE_BYTES) {
    result = await canvasToBlob(canvas, 'image/jpeg', 0.78);
  }
  if (!result || result.size > MAX_IMAGE_BYTES) {
    throw new ApiError('IMAGE_TOO_LARGE', 'Image is too large.', 'errors.imageTooLarge');
  }
  return result;
}

function imageExtension(type) {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';
  return 'jpg';
}

function randomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function uploadPhoto(userId, listingId, blob, index) {
  const type = blob.type || 'image/jpeg';
  const path = `${userId}/${listingId}/${Date.now()}-${index}-${randomId()}.${imageExtension(type)}`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, blob, {
    contentType: type,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw toApiError(error, 'errors.imageUpload');
  return path;
}

async function loadExistingImages(listingId) {
  const { data, error } = await supabase
    .from('listing_images')
    .select('storage_path, sort_order')
    .eq('listing_id', listingId)
    .order('sort_order');
  if (error) throw toApiError(error, 'errors.loadFailed');
  return data || [];
}

async function syncPhotos({ userId, listingId, photos, title }) {
  if (!Array.isArray(photos)) return null;
  if (!photos.length) {
    throw new ApiError('VALIDATION', 'Add at least one photo.', 'sell.photoRequired');
  }
  if (photos.length > MAX_PHOTOS) {
    throw new ApiError('VALIDATION', 'Too many photos.', 'errors.tooManyPhotos');
  }

  const existing = await loadExistingImages(listingId);
  const existingByUrl = new Map(
    existing.map((row) => [publicImageUrl(row.storage_path), row.storage_path]),
  );

  const uploaded = [];
  const finalImages = [];

  try {
    for (let index = 0; index < photos.length; index += 1) {
      const photo = photos[index];
      if (typeof photo !== 'string') {
        throw new ApiError('IMAGE_UPLOAD', 'Invalid photo.', 'errors.imageUpload');
      }

      if (photo.startsWith('data:image/')) {
        const response = await fetch(photo);
        const original = await response.blob();
        const blob = await compressImage(original);
        const path = await uploadPhoto(userId, listingId, blob, index);
        uploaded.push(path);
        finalImages.push({ path, alt: `${title} — photo ${index + 1}` });
        continue;
      }

      if (/^https?:\/\//i.test(photo)) {
        const path = existingByUrl.get(photo);
        if (!path) {
          throw new ApiError('IMAGE_UPLOAD', 'Unknown photo.', 'errors.imageUpload');
        }
        finalImages.push({ path, alt: `${title} — photo ${index + 1}` });
        continue;
      }

      throw new ApiError('IMAGE_UPLOAD', 'Invalid photo.', 'errors.imageUpload');
    }

    const { data, error } = await supabase.rpc('replace_listing_images', {
      p_listing_id: listingId,
      p_images: finalImages,
    });
    if (error) throw toApiError(error, 'errors.imageUpload');

    const kept = new Set(finalImages.map((image) => image.path));
    const removed = existing.map((row) => row.storage_path).filter((path) => !kept.has(path));
    if (removed.length) {
      await supabase.storage.from(IMAGE_BUCKET).remove(removed);
    }

    return data;
  } catch (error) {
    if (uploaded.length) {
      await supabase.storage.from(IMAGE_BUCKET).remove(uploaded);
    }
    throw error;
  }
}

export function createSupabaseApi() {
  return {
    categories: {
      async list() {
        const { data, error } = await supabase
          .from('categories')
          .select('id, slug, name_en, name_hi, sort_order, attributes_schema')
          .order('sort_order');
        if (error) throw toApiError(error, 'errors.loadFailed');
        return (data || []).map((category) => ({
          id: category.id,
          slug: category.slug,
          nameEn: category.name_en,
          nameHi: category.name_hi,
          sortOrder: category.sort_order,
          attributesSchema: category.attributes_schema,
        }));
      },
    },

    cities: {
      async list() {
        const { data, error } = await supabase
          .from('cities')
          .select('id, slug, name, name_hi, state, is_active, is_launch, sort_order')
          .order('sort_order');
        if (error) throw toApiError(error, 'errors.loadFailed');
        return (data || []).map((city) => ({
          id: city.id,
          slug: city.slug,
          name: city.name,
          nameHi: city.name_hi,
          state: city.state,
          isActive: city.is_active,
          isLaunch: city.is_launch,
          sortOrder: city.sort_order,
        }));
      },
    },

    auth: {
      async session() {
        const profile = await readProfile();
        if (!profile) return anonymous();
        return signedInPayload(profile);
      },

      async login({ email, password }) {
        const { error } = await supabase.auth.signInWithPassword({
          email: String(email ?? '')
            .trim()
            .toLowerCase(),
          password: String(password ?? ''),
        });
        if (error) throw toApiError(error, 'errors.loginFailed');

        const profile = await readProfile();
        if (!profile) {
          await supabase.auth.signOut();
          throw new ApiError('NO_SESSION', 'Could not load your profile.', 'errors.noSession');
        }
        return signedInPayload(profile);
      },

      async signup({ name, email, phone, password, cityId }) {
        const { data, error } = await supabase.auth.signUp({
          email: String(email ?? '')
            .trim()
            .toLowerCase(),
          password: String(password ?? ''),
          options: {
            data: {
              name: String(name ?? '')
                .trim()
                .slice(0, 60),
              phone: String(phone ?? '')
                .replace(/\D/g, '')
                .slice(-10),
              city_id: cityId || 'city-khargone',
            },
          },
        });
        if (error) throw toApiError(error, 'errors.signupFailed');
        if (!data.session) {
          throw new ApiError(
            'EMAIL_CONFIRMATION',
            'Check your email to confirm your account.',
            'errors.confirmEmail',
          );
        }

        const profile = await readProfile();
        if (!profile) {
          throw new ApiError('NO_SESSION', 'Could not load your profile.', 'errors.noSession');
        }
        return signedInPayload(profile);
      },

      async reset(email) {
        const redirectTo = `${window.location.origin}/login`;
        const { error } = await supabase.auth.resetPasswordForEmail(
          String(email ?? '')
            .trim()
            .toLowerCase(),
          { redirectTo },
        );
        if (error) throw toApiError(error, 'errors.resetFailed');
        return {
          ok: true,
          email: String(email ?? '')
            .trim()
            .toLowerCase(),
        };
      },

      async logout() {
        const { error } = await supabase.auth.signOut();
        if (error) throw toApiError(error, 'errors.generic');
        return anonymous();
      },

      async updateProfile(values = {}) {
        const { data, error } = await supabase.rpc('update_my_profile', {
          p_name: values.name,
          p_phone: values.phone ?? null,
          p_city_id: values.cityId ?? null,
          p_bio: values.bio ?? null,
        });
        if (error) throw toApiError(error, 'errors.saveFailed');
        return signedInPayload(data);
      },
    },

    listings: {
      async feed(params = {}) {
        const { data, error } = await supabase.rpc('get_feed', {
          p_city_id: params.cityId || null,
          p_category_id: params.categoryId || null,
          p_q: String(params.q ?? ''),
          p_min_price: Number.isFinite(Number(params.minPrice)) ? Number(params.minPrice) : null,
          p_max_price: Number.isFinite(Number(params.maxPrice)) ? Number(params.maxPrice) : null,
          p_condition: params.condition || '',
          p_with_photos: Boolean(params.withPhotos),
          p_sort: params.sort || 'newest',
          p_limit: Number(params.limit) || 20,
          p_cursor: String(params.cursor ?? '0'),
          p_featured_only: Boolean(params.featured),
        });
        if (error) throw toApiError(error, 'errors.loadFailed');
        return {
          items: decorateList(data?.items),
          total: Number(data?.total) || 0,
          nextCursor: data?.nextCursor ?? null,
        };
      },

      async featured({ cityId = null, limit = 8 } = {}) {
        const { data, error } = await supabase.rpc('get_featured', {
          p_city_id: cityId,
          p_limit: Number(limit) || 8,
        });
        if (error) throw toApiError(error, 'errors.loadFailed');
        return decorateList(data);
      },

      async get(id) {
        const { data, error } = await supabase.rpc('get_listing', { p_id: id });
        if (error) throw toApiError(error, 'errors.notFound');
        if (!data) throw notFound('Listing not found.');
        return decorateListing(data);
      },

      async similar(id, { limit = 6 } = {}) {
        const { data, error } = await supabase.rpc('get_similar', {
          p_id: id,
          p_limit: Number(limit) || 6,
        });
        if (error) return [];
        return decorateList(data);
      },

      async view(id) {
        const { data, error } = await supabase.rpc('record_listing_view', { p_id: id });
        if (error) throw toApiError(error, 'errors.loadFailed');
        return data;
      },

      async contact(id) {
        const { data, error } = await supabase.rpc('get_listing_contact', { p_id: id });
        if (error) throw toApiError(error, 'errors.contactFailed');
        return data;
      },

      async create(values = {}) {
        const userId = await currentUserId();
        const payload = listingPayload(values);

        const { data: inserted, error } = await supabase
          .from('listings')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw toApiError(error, 'errors.saveFailed');

        try {
          if (!Array.isArray(values.photos) || !values.photos.length) {
            throw new ApiError('VALIDATION', 'Add at least one photo.', 'sell.photoRequired');
          }
          const listing = await syncPhotos({
            userId,
            listingId: inserted.id,
            photos: values.photos,
            title: payload.title,
          });
          return decorateListing(listing);
        } catch (error) {
          await supabase.rpc('remove_listing', { p_id: inserted.id });
          throw toApiError(error, 'errors.saveFailed');
        }
      },

      async update(id, values = {}) {
        const userId = await currentUserId();
        const payload = listingPayload(values);

        const { data: updated, error } = await supabase
          .from('listings')
          .update(payload)
          .eq('id', id)
          .select('id')
          .maybeSingle();
        if (error) throw toApiError(error, 'errors.saveFailed');
        if (!updated) throw notFound('Listing not found.');

        try {
          const listing = await syncPhotos({
            userId,
            listingId: id,
            photos: values.photos,
            title: payload.title,
          });
          return decorateListing(listing);
        } catch (error) {
          throw toApiError(error, 'errors.saveFailed');
        }
      },

      async remove(id) {
        const existing = await loadExistingImages(id);
        const { error } = await supabase.rpc('remove_listing', { p_id: id });
        if (error) throw toApiError(error, 'errors.saveFailed');

        if (existing.length) {
          await supabase.storage.from(IMAGE_BUCKET).remove(existing.map((row) => row.storage_path));
        }
        return { ok: true };
      },

      async markSold(id) {
        const { data, error } = await supabase.rpc('mark_listing_sold', { p_id: id });
        if (error) throw toApiError(error, 'errors.saveFailed');
        return decorateListing(data);
      },

      async renew(id) {
        const { data, error } = await supabase.rpc('renew_listing', { p_id: id });
        if (error) throw toApiError(error, 'errors.saveFailed');
        return decorateListing(data);
      },

      async my() {
        const { data, error } = await supabase.rpc('get_my_listings');
        if (error) throw toApiError(error, 'errors.loadFailed');
        return decorateList(data);
      },
    },

    favourites: {
      async ids() {
        const { data, error } = await supabase.rpc('get_favourite_ids');
        if (error) return [];
        return Array.isArray(data) ? data : [];
      },

      async list() {
        await currentUserId();
        const { data, error } = await supabase.rpc('get_favourites');
        if (error) throw toApiError(error, 'errors.favouriteFailed');
        return decorateList(data);
      },

      async toggle(id) {
        const userId = await currentUserId();
        const existing = await supabase
          .from('favourites')
          .select('listing_id')
          .eq('user_id', userId)
          .eq('listing_id', id)
          .maybeSingle();
        if (existing.error) throw toApiError(existing.error, 'errors.favouriteFailed');

        if (existing.data) {
          const { error } = await supabase
            .from('favourites')
            .delete()
            .eq('user_id', userId)
            .eq('listing_id', id);
          if (error) throw toApiError(error, 'errors.favouriteFailed');
        } else {
          const { error } = await supabase
            .from('favourites')
            .insert({ user_id: userId, listing_id: id });
          if (error && error.code !== '23505') {
            throw toApiError(error, 'errors.favouriteFailed');
          }
        }

        const { data, error } = await supabase.rpc('get_favourite_ids');
        if (error) throw toApiError(error, 'errors.favouriteFailed');
        const ids = Array.isArray(data) ? data : [];
        return { saved: ids.includes(id), ids };
      },
    },

    chats: {
      async list() {
        await currentUserId();
        const { data, error } = await supabase.rpc('get_chat_list');
        if (error) throw toApiError(error, 'errors.chatFailed');
        return (Array.isArray(data) ? data : []).map(decorateConversation);
      },

      async get(id) {
        await currentUserId();
        const { data, error } = await supabase.rpc('get_chat', { p_id: id });
        if (error) throw toApiError(error, 'errors.chatFailed');
        if (!data) throw notFound('Conversation not found.');
        return decorateChat(data);
      },

      async start(listingId) {
        await currentUserId();
        const { data, error } = await supabase.rpc('start_conversation', {
          p_listing_id: listingId,
        });
        if (error) throw toApiError(error, 'errors.chatFailed');
        return data;
      },

      async send(id, body) {
        await currentUserId();
        const { data, error } = await supabase.rpc('send_message', {
          p_conversation_id: id,
          p_body: String(body ?? ''),
        });
        if (error) throw toApiError(error, 'errors.chatFailed');
        return data;
      },

      async markRead(id) {
        await currentUserId();
        const { data, error } = await supabase.rpc('mark_conversation_read', { p_id: id });
        if (error) throw toApiError(error, 'errors.chatFailed');
        return data;
      },

      async unread() {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return { count: 0 };
        const { data, error } = await supabase.rpc('get_unread_chat_count');
        if (error) return { count: 0 };
        return { count: Number(data) || 0 };
      },
    },

    notifications: {
      async list() {
        await currentUserId();
        const { data, error } = await supabase.rpc('get_notifications');
        if (error) throw toApiError(error, 'errors.loadFailed');
        return Array.isArray(data) ? data : [];
      },

      async unread() {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return { count: 0 };
        const { data, error } = await supabase.rpc('get_unread_notification_count');
        if (error) return { count: 0 };
        return { count: Number(data) || 0 };
      },

      async markAllRead() {
        await currentUserId();
        const { data, error } = await supabase.rpc('mark_all_notifications_read');
        if (error) throw toApiError(error, 'errors.saveFailed');
        return data;
      },

      async markRead(id) {
        await currentUserId();
        const { data, error } = await supabase.rpc('mark_notification_read', { p_id: id });
        if (error) throw toApiError(error, 'errors.saveFailed');
        return data;
      },
    },

    sellers: {
      async get(id) {
        const { data, error } = await supabase.rpc('get_seller', { p_id: id });
        if (error) throw toApiError(error, 'errors.loadFailed');
        if (!data?.seller) throw notFound('Seller not found.');
        return data;
      },

      async listings(id) {
        const { data, error } = await supabase.rpc('get_seller_listings', { p_id: id });
        if (error) throw toApiError(error, 'errors.loadFailed');
        return decorateList(data);
      },
    },

    blocks: {
      async list() {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return [];
        const { data, error } = await supabase.rpc('get_my_blocks');
        if (error) return [];
        return Array.isArray(data) ? data : [];
      },

      async toggle(sellerId) {
        await currentUserId();
        const { data, error } = await supabase.rpc('toggle_block', { p_seller_id: sellerId });
        if (error) throw toApiError(error, 'errors.saveFailed');
        return data;
      },
    },

    reports: {
      async create(values = {}) {
        await currentUserId();
        const { data, error } = await supabase.rpc('create_report', {
          p_listing_id: values.listingId || null,
          p_user_id: values.userId || null,
          p_reason: String(values.reason ?? ''),
          p_details: String(values.details ?? ''),
        });
        if (error) throw toApiError(error, 'errors.reportFailed');
        return data;
      },
    },

    reviews: {
      async list({ listingId, sellerId }) {
        await currentUserId();
        let query = supabase
          .from('reviews')
          .select(
            'id, reviewer_id, seller_id, listing_id, rating, body, created_at, reviewer:profiles(name)',
          )
          .order('created_at', { ascending: false });
        if (listingId) query = query.eq('listing_id', listingId);
        if (sellerId) query = query.eq('seller_id', sellerId);
        const { data, error } = await query;
        if (error) throw toApiError(error, 'errors.loadFailed');
        return (Array.isArray(data) ? data : []).map((item) => ({
          id: item.id,
          reviewerId: item.reviewer_id,
          reviewerName: item.reviewer?.name || '',
          listingId: item.listing_id,
          sellerId: item.seller_id,
          rating: item.rating,
          body: item.body,
          createdAt: item.created_at,
        }));
      },

      async create(values) {
        await currentUserId();
        const { data, error } = await supabase
          .from('reviews')
          .insert({
            listing_id: values.listingId,
            seller_id: values.sellerId,
            rating: values.rating,
            body: values.body,
          })
          .select('id, reviewer_id, seller_id, listing_id, rating, body, created_at')
          .single();
        if (error) throw toApiError(error, 'errors.reviewFailed');
        return {
          id: data.id,
          reviewerId: data.reviewer_id,
          reviewerName: '',
          listingId: data.listing_id,
          sellerId: data.seller_id,
          rating: data.rating,
          body: data.body,
          createdAt: data.created_at,
        };
      },
    },

    savedSearches: {
      async list() {
        await currentUserId();
        const { data, error } = await supabase
          .from('saved_searches')
          .select('id, name, query, notify, created_at')
          .order('created_at', { ascending: false });
        if (error) throw toApiError(error, 'errors.loadFailed');
        return (Array.isArray(data) ? data : []).map((item) => ({
          id: item.id,
          name: item.name,
          query: item.query,
          notify: item.notify,
          createdAt: item.created_at,
        }));
      },

      async create(values) {
        await currentUserId();
        const { data, error } = await supabase
          .from('saved_searches')
          .insert({
            name: values.name,
            query: values.query,
            notify: values.notify !== false,
          })
          .select('id, name, query, notify, created_at')
          .single();
        if (error) throw toApiError(error, 'errors.saveFailed');
        return {
          id: data.id,
          name: data.name,
          query: data.query,
          notify: data.notify,
          createdAt: data.created_at,
        };
      },

      async update(id, values) {
        await currentUserId();
        const { data, error } = await supabase
          .from('saved_searches')
          .update({
            name: values.name,
            query: values.query,
            notify: values.notify,
          })
          .eq('id', id)
          .select('id, name, query, notify, created_at')
          .single();
        if (error) throw toApiError(error, 'errors.saveFailed');
        return {
          id: data.id,
          name: data.name,
          query: data.query,
          notify: data.notify,
          createdAt: data.created_at,
        };
      },

      async delete(id) {
        await currentUserId();
        const { error } = await supabase.from('saved_searches').delete().eq('id', id);
        if (error) throw toApiError(error, 'errors.deleteFailed');
        return { ok: true };
      },
    },

    wantedPosts: {
      async list() {
        const { data, error } = await supabase
          .from('wanted_posts')
          .select(
            'id, user_id, city_id, category_id, title, description, budget, status, created_at, expires_at, user:profiles(name)',
          )
          .eq('status', 'open')
          .order('created_at', { ascending: false });
        if (error) throw toApiError(error, 'errors.loadFailed');
        return (Array.isArray(data) ? data : []).map((item) => ({
          id: item.id,
          userId: item.user_id,
          posterName: item.user?.name || '',
          cityId: item.city_id,
          categoryId: item.category_id,
          title: item.title,
          description: item.description,
          budget: item.budget,
          status: item.status,
          createdAt: item.created_at,
          expiresAt: item.expires_at,
        }));
      },

      async create(values) {
        const userId = await currentUserId();
        const { data, error } = await supabase
          .from('wanted_posts')
          .insert({
            user_id: userId,
            city_id: values.cityId,
            category_id: values.categoryId,
            title: values.title,
            description: values.description,
            budget: values.budget,
            status: 'open',
          })
          .select('id')
          .single();
        if (error) throw toApiError(error, 'errors.saveFailed');
        return { id: data.id };
      },

      async update(id, values) {
        await currentUserId();
        const { data, error } = await supabase
          .from('wanted_posts')
          .update({
            title: values.title,
            description: values.description,
            city_id: values.cityId,
            category_id: values.categoryId,
            budget: values.budget,
            status: values.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select('id')
          .single();
        if (error) throw toApiError(error, 'errors.saveFailed');
        return { id: data.id };
      },

      async delete(id) {
        await currentUserId();
        const { error } = await supabase.from('wanted_posts').delete().eq('id', id);
        if (error) throw toApiError(error, 'errors.deleteFailed');
        return { ok: true };
      },
    },

    promotions: {
      async list() {
        await currentUserId();
        const { data, error } = await supabase
          .from('promotions')
          .select(
            'id, user_id, listing_id, product_id, payment_id, status, starts_at, expires_at, created_at',
          )
          .eq('user_id', (await supabase.auth.getSession()).data.session?.user.id)
          .order('created_at', { ascending: false });
        if (error) throw toApiError(error, 'errors.loadFailed');
        return (Array.isArray(data) ? data : []).map((item) => ({
          id: item.id,
          userId: item.user_id,
          listingId: item.listing_id,
          productId: item.product_id,
          paymentId: item.payment_id,
          status: item.status,
          startsAt: item.starts_at,
          expiresAt: item.expires_at,
          createdAt: item.created_at,
        }));
      },

      async create(values) {
        await currentUserId();
        // Verify the listing belongs to the user.
        const { data: listing, error: listingError } = await supabase
          .from('listings')
          .select('id, seller_id')
          .eq('id', values.listingId)
          .single();
        if (listingError || !listing) throw notFound('Listing not found.');
        if (listing.seller_id !== (await supabase.auth.getSession()).data.session?.user.id) {
          throw new ApiError(
            'NOT_OWNER',
            'You can only boost your own listings.',
            'promotions.notOwner',
          );
        }

        // Verify the product exists and is active.
        const { data: product, error: productError } = await supabase
          .from('promotion_products')
          .select('id, duration_days, price_inr, is_active')
          .eq('id', values.productId)
          .eq('is_active', true)
          .single();
        if (productError || !product) throw notFound('Boost product not found.');

        // Check for existing active boost.
        const { data: existing } = await supabase
          .from('promotions')
          .select('id')
          .eq('listing_id', values.listingId)
          .eq('status', 'active')
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();
        if (existing) {
          throw new ApiError(
            'ALREADY_BOOSTED',
            'This listing already has an active boost.',
            'promotions.alreadyBoosted',
          );
        }

        // Create payment record.
        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .insert({
            user_id: (await supabase.auth.getSession()).data.session?.user.id,
            provider: 'razorpay',
            provider_order_id: `mock_${crypto.randomUUID()}`,
            provider_payment_id: `mock_pay_${crypto.randomUUID()}`,
            amount_inr: product.price_inr,
            currency: 'INR',
            status: 'paid',
            raw_payload: { mock: true },
          })
          .select('id')
          .single();
        if (paymentError) throw toApiError(paymentError, 'errors.saveFailed');

        const now = new Date();
        const expiresAt = new Date(now.getTime() + product.duration_days * 86400000).toISOString();

        const { data: promotion, error: promotionError } = await supabase
          .from('promotions')
          .insert({
            user_id: (await supabase.auth.getSession()).data.session?.user.id,
            listing_id: values.listingId,
            product_id: product.id,
            payment_id: payment.id,
            status: 'active',
            starts_at: now.toISOString(),
            expires_at: expiresAt,
          })
          .select(
            'id, user_id, listing_id, product_id, payment_id, status, starts_at, expires_at, created_at',
          )
          .single();
        if (promotionError) throw toApiError(promotionError, 'errors.saveFailed');

        // Mark the listing as featured while the boost is active.
        await supabase.from('listings').update({ is_featured: true }).eq('id', values.listingId);

        return {
          id: promotion.id,
          listingId: promotion.listing_id,
          productId: promotion.product_id,
          paymentId: promotion.payment_id,
          status: promotion.status,
          startsAt: promotion.starts_at,
          expiresAt: promotion.expires_at,
          createdAt: promotion.created_at,
        };
      },
    },

    payments: {
      async list() {
        await currentUserId();
        const { data, error } = await supabase
          .from('payments')
          .select('id, provider_order_id, amount_inr, currency, status, created_at')
          .eq('user_id', (await supabase.auth.getSession()).data.session?.user.id)
          .order('created_at', { ascending: false });
        if (error) throw toApiError(error, 'errors.loadFailed');
        return (Array.isArray(data) ? data : []).map((item) => ({
          id: item.id,
          providerOrderId: item.provider_order_id,
          amountInr: item.amount_inr,
          currency: item.currency,
          status: item.status,
          createdAt: item.created_at,
        }));
      },

      async create(values) {
        await currentUserId();
        const { data: product, error: productError } = await supabase
          .from('promotion_products')
          .select('id, price_inr, is_active')
          .eq('id', values.productId)
          .eq('is_active', true)
          .single();
        if (productError || !product) throw notFound('Boost product not found.');

        const { data: payment, error: error } = await supabase
          .from('payments')
          .insert({
            user_id: (await supabase.auth.getSession()).data.session?.user.id,
            provider: 'razorpay',
            provider_order_id: `mock_${crypto.randomUUID()}`,
            provider_payment_id: null,
            amount_inr: product.price_inr,
            currency: 'INR',
            status: 'created',
            raw_payload: { mock: true },
          })
          .select('id, provider_order_id, amount_inr, currency, status, created_at')
          .single();
        if (error) throw toApiError(error, 'errors.saveFailed');
        return {
          id: payment.id,
          providerOrderId: payment.provider_order_id,
          amountInr: payment.amount_inr,
          currency: payment.currency,
          status: payment.status,
          createdAt: payment.created_at,
        };
      },
    },

    accountDeletionRequests: {
      async list() {
        await currentUserId();
        const { data, error } = await supabase
          .from('account_deletion_requests')
          .select('id, reason, status, requested_at')
          .eq('user_id', (await supabase.auth.getSession()).data.session?.user.id)
          .order('requested_at', { ascending: false });
        if (error) throw toApiError(error, 'errors.loadFailed');
        return (Array.isArray(data) ? data : []).map((item) => ({
          id: item.id,
          status: item.status,
          requestedAt: item.requested_at,
        }));
      },

      async create(values) {
        await currentUserId();
        const { data: existing, error: existingError } = await supabase
          .from('account_deletion_requests')
          .select('id')
          .eq('user_id', (await supabase.auth.getSession()).data.session?.user.id)
          .eq('status', 'pending')
          .maybeSingle();
        if (existingError) throw toApiError(existingError, 'errors.loadFailed');
        if (existing) {
          throw new ApiError(
            'PENDING_DELETION',
            'You already have a pending deletion request.',
            'accountDeletionRequests.pendingDeletion',
          );
        }

        const { data, error } = await supabase
          .from('account_deletion_requests')
          .insert({
            user_id: (await supabase.auth.getSession()).data.session?.user.id,
            reason: values.reason,
            status: 'pending',
          })
          .select('id, status, requested_at')
          .single();
        if (error) throw toApiError(error, 'errors.saveFailed');
        return { id: data.id, status: data.status, requestedAt: data.requested_at };
      },

      async cancel(id) {
        await currentUserId();
        const { data, error } = await supabase
          .from('account_deletion_requests')
          .update({ status: 'cancelled' })
          .eq('id', id)
          .eq('user_id', (await supabase.auth.getSession()).data.session?.user.id)
          .eq('status', 'pending')
          .select('id, status')
          .single();
        if (error) throw toApiError(error, 'errors.saveFailed');
        if (!data) throw notFound('Deletion request not found or not pending.');
        return { id: data.id, status: data.status };
      },
    },

    admin: {
      async stats() {
        await currentUserId();
        const { data: session } = await supabase.auth.getSession();
        const { rpcError } = await supabase.rpc('is_admin');
        if (rpcError || !session?.user) throw forbidden('Admin only.');

        const [usersRes, listingsRes, reportsRes, promotionsRes, paymentsRes] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('listings').select('id, status', { count: 'exact', head: true }),
          supabase.from('reports').select('id, status', { count: 'exact', head: true }),
          supabase.from('promotions').select('id', { count: 'exact', head: true }),
          supabase.from('payments').select('id', { count: 'exact', head: true }),
        ]);

        const activeListingsRes = await supabase
          .from('listings')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active');
        const openReportsRes = await supabase
          .from('reports')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'open');

        return {
          users: usersRes.count || 0,
          listings: listingsRes.count || 0,
          activeListings: activeListingsRes.count || 0,
          reports: reportsRes.count || 0,
          openReports: openReportsRes.count || 0,
          promotions: promotionsRes.count || 0,
          payments: paymentsRes.count || 0,
        };
      },

      async reports() {
        await currentUserId();
        const { data, error } = await supabase
          .from('reports')
          .select(
            'id, reporter_id, reason, status, details, created_at, reporter:profiles(name), target_listing_id, target_user_id',
          )
          .order('created_at', { ascending: false });
        if (error) throw toApiError(error, 'errors.loadFailed');
        return (Array.isArray(data) ? data : []).map((item) => ({
          id: item.id,
          reporterId: item.reporter_id,
          reporterName: item.reporter?.name || '',
          targetListingId: item.target_listing_id,
          targetUserId: item.target_user_id,
          reason: item.reason,
          status: item.status,
          details: item.details,
          createdAt: item.created_at,
        }));
      },

      async updateReport(id, values) {
        await currentUserId();
        const { data, error } = await supabase
          .from('reports')
          .update({
            status: values.status,
            reviewed_at: values.reviewedAt,
            reviewed_by: values.reviewedBy,
            resolution: values.resolution,
          })
          .eq('id', id)
          .select('id')
          .single();
        if (error) throw toApiError(error, 'errors.saveFailed');
        return { id: data.id };
      },

      async listings() {
        await currentUserId();
        const { data, error } = await supabase
          .from('listings')
          .select(
            'id, title, seller_id, status, is_featured, views_count, contacts_count, created_at, expires_at, seller:profiles(name)',
          )
          .order('created_at', { ascending: false });
        if (error) throw toApiError(error, 'errors.loadFailed');
        return (Array.isArray(data) ? data : []).map((item) => ({
          id: item.id,
          title: item.title,
          sellerId: item.seller_id,
          sellerName: item.seller?.name || '',
          status: item.status,
          isFeatured: item.is_featured,
          viewsCount: item.views_count,
          contactsCount: item.contacts_count,
          createdAt: item.created_at,
          expiresAt: item.expires_at,
        }));
      },

      async hideListing(id) {
        await currentUserId();
        const { data, error } = await supabase
          .from('listings')
          .update({ status: 'hidden', closed_at: new Date().toISOString() })
          .eq('id', id)
          .select('id, status')
          .single();
        if (error) throw toApiError(error, 'errors.saveFailed');
        return { id: data.id, status: data.status };
      },

      async banners() {
        await currentUserId();
        const { data, error } = await supabase
          .from('banners')
          .select(
            'id, title, image_path, link_url, city_id, starts_at, ends_at, is_active, sort_order',
          )
          .order('sort_order', { ascending: true });
        if (error) throw toApiError(error, 'errors.loadFailed');
        return (Array.isArray(data) ? data : []).map((item) => ({
          id: item.id,
          title: item.title,
          imagePath: item.image_path,
          linkUrl: item.link_url,
          cityId: item.city_id,
          startsAt: item.starts_at,
          endsAt: item.ends_at,
          isActive: item.is_active,
          sortOrder: item.sort_order,
        }));
      },

      async createBanner(values) {
        await currentUserId();
        const { data, error } = await supabase
          .from('banners')
          .insert({
            title: values.title,
            image_path: values.imagePath,
            link_url: values.linkUrl,
            city_id: values.cityId,
            starts_at: values.startsAt,
            ends_at: values.endsAt,
            is_active: values.isActive !== false,
            sort_order: values.sortOrder,
          })
          .select()
          .single();
        if (error) throw toApiError(error, 'errors.saveFailed');
        return {
          id: data.id,
          title: data.title,
          imagePath: data.image_path,
          linkUrl: data.link_url,
          cityId: data.city_id,
          startsAt: data.starts_at,
          endsAt: data.ends_at,
          isActive: data.is_active,
          sortOrder: data.sort_order,
        };
      },

      async updateBanner(id, values) {
        await currentUserId();
        const { data, error } = await supabase
          .from('banners')
          .update({
            title: values.title,
            image_path: values.imagePath,
            link_url: values.linkUrl,
            city_id: values.cityId,
            starts_at: values.startsAt,
            ends_at: values.endsAt,
            is_active: values.isActive,
            sort_order: values.sortOrder,
          })
          .eq('id', id)
          .select()
          .single();
        if (error) throw toApiError(error, 'errors.saveFailed');
        return {
          id: data.id,
          title: data.title,
          imagePath: data.image_path,
          linkUrl: data.link_url,
          cityId: data.city_id,
          startsAt: data.starts_at,
          endsAt: data.ends_at,
          isActive: data.is_active,
          sortOrder: data.sort_order,
        };
      },

      async deleteBanner(id) {
        await currentUserId();
        const { error } = await supabase.from('banners').delete().eq('id', id);
        if (error) throw toApiError(error, 'errors.deleteFailed');
        return { ok: true };
      },
    },

    meta: {
      async counts() {
        const { data, error } = await supabase.rpc('get_meta_counts');
        if (error) throw toApiError(error, 'errors.loadFailed');
        return data;
      },
    },
  };
}

export const createApi = createSupabaseApi;

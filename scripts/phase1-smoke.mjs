import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  fs
    .readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
    }),
);

if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
  throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local first.');
}

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;
const stamp = Date.now().toString(36);
const password = `Phase1!${stamp}`;
const sellerEmail = `phase1-seller-${stamp}@example.com`;
const buyerEmail = `phase1-buyer-${stamp}@example.com`;

function makeClient() {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

const seller = makeClient();
const buyer = makeClient();
const anon = makeClient();

let passed = 0;
const failures = [];

function check(label, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`PASS ${label}`);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
    console.log(`FAIL ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

async function signup(client, email, name, phone) {
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { name, phone, city_id: 'city-khargone' } },
  });
  if (error) throw error;
  if (!data.session) throw new Error(`No session for ${email}; is email confirmation still on?`);
  return data.user;
}

const sellerUser = await signup(seller, sellerEmail, 'Phase One Seller', '9876500111');
const buyerUser = await signup(buyer, buyerEmail, 'Phase One Buyer', '9876500222');

const sellerProfile = await seller.rpc('get_my_profile');
check('seller profile is created by trigger', sellerProfile.data?.id === sellerUser.id);
check('seller phone is private but visible to owner', sellerProfile.data?.phone === '9876500111');

const anonCities = await anon.from('cities').select('id, is_active');
check(
  'anonymous sees only active cities',
  anonCities.data?.length === 1 && anonCities.data[0].id === 'city-khargone',
  anonCities.error?.message,
);

const listingInsert = await seller
  .from('listings')
  .insert({
    title: `Phase 1 test cycle ${stamp}`,
    description: 'RLS smoke-test listing. Safe to remove.',
    price: 1200,
    is_negotiable: true,
    category_id: 'cat-cycles',
    city_id: 'city-khargone',
    area: 'MG Road',
    condition: 'good',
    attributes: { Brand: 'Test' },
  })
  .select('id')
  .single();
check('seller can create a listing', Boolean(listingInsert.data?.id), listingInsert.error?.message);
const listingId = listingInsert.data.id;

const publicListing = await anon.rpc('get_listing', { p_id: listingId });
check('anonymous can read a public listing', publicListing.data?.id === listingId);
check('anonymous is not marked as owner', publicListing.data?.isMine === false);

const buyerFeed = await buyer.rpc('get_feed', {
  p_city_id: 'city-khargone',
  p_limit: 20,
});
check(
  'active listing appears in the feed',
  buyerFeed.data?.items?.some((item) => item.id === listingId),
  buyerFeed.error?.message,
);

const foreignUpdate = await buyer
  .from('listings')
  .update({ title: 'Hijacked title' })
  .eq('id', listingId)
  .select('id');
check(
  'buyer cannot update another seller listing',
  !foreignUpdate.error && (foreignUpdate.data || []).length === 0,
  foreignUpdate.error?.message,
);

const protectedInsert = await buyer
  .from('listings')
  .insert({
    title: 'Should not exist',
    category_id: 'cat-cycles',
    city_id: 'city-khargone',
    is_featured: true,
  })
  .select('id');
check(
  'buyer cannot insert a featured listing',
  Boolean(protectedInsert.error),
  protectedInsert.error?.message,
);

const protectedUpdate = await seller
  .from('listings')
  .update({ is_featured: true })
  .eq('id', listingId)
  .select('id');
check(
  'seller cannot self-promote through a column update',
  Boolean(protectedUpdate.error),
  protectedUpdate.error?.message,
);

const privateContacts = await buyer
  .from('profile_contacts')
  .select('phone')
  .eq('user_id', sellerUser.id);
check(
  'buyer cannot read the seller contact table',
  !privateContacts.error && (privateContacts.data || []).length === 0,
  privateContacts.error?.message,
);

const buyerNotifications = await buyer
  .from('notifications')
  .select('id')
  .eq('user_id', sellerUser.id);
check(
  'buyer cannot read seller notifications',
  !buyerNotifications.error && (buyerNotifications.data || []).length === 0,
  buyerNotifications.error?.message,
);

const contact = await buyer.rpc('get_listing_contact', { p_id: listingId });
check('contact reveal returns the seller phone', contact.data?.phone === '9876500111');
const contactAgain = await buyer.rpc('get_listing_contact', { p_id: listingId });
check('contact reveal is available to signed-in buyers', Boolean(contactAgain.data?.phone));

const conversation = await buyer.rpc('start_conversation', { p_listing_id: listingId });
const conversationId = conversation.data?.id;
check('buyer can start a conversation', Boolean(conversationId), conversation.error?.message);

const buyerChat = await buyer.rpc('get_chat', { p_id: conversationId });
check('buyer can read their conversation', buyerChat.data?.conversation?.id === conversationId);
check(
  'buyer cannot start a conversation for their own listing',
  (await seller.rpc('start_conversation', { p_listing_id: listingId })).error?.message ===
    'own_listing',
);

const sellerChats = await seller.rpc('get_chat_list');
check(
  'seller can see the conversation',
  (sellerChats.data || []).some((item) => item.id === conversationId),
);

const anonConversations = await anon.from('conversations').select('id');
check(
  'anonymous cannot read conversations',
  Boolean(anonConversations.error),
  anonConversations.error?.message,
);

const anonMessages = await anon.from('messages').select('id');
check('anonymous cannot read messages', Boolean(anonMessages.error), anonMessages.error?.message);

const buyerFavourites = await buyer.from('favourites').insert({
  user_id: buyerUser.id,
  listing_id: listingId,
});
check('buyer can favourite a listing', !buyerFavourites.error, buyerFavourites.error?.message);

const block = await buyer.rpc('toggle_block', { p_seller_id: sellerUser.id });
check('buyer can block a seller', block.data?.blocked === true);
const feedWhileBlocked = await buyer.rpc('get_feed', { p_city_id: 'city-khargone' });
check(
  'blocked seller listings leave the buyer feed',
  !feedWhileBlocked.data?.items?.some((item) => item.id === listingId),
);
await buyer.rpc('toggle_block', { p_seller_id: sellerUser.id });
const feedAfterUnblock = await buyer.rpc('get_feed', { p_city_id: 'city-khargone' });
check(
  'unblocking restores the listing',
  feedAfterUnblock.data?.items?.some((item) => item.id === listingId),
);

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64',
);
const storagePath = `${sellerUser.id}/${listingId}/test-${stamp}.png`;
const sellerUpload = await seller.storage
  .from('listing-images')
  .upload(storagePath, png, { contentType: 'image/png' });
check(
  'seller can upload to their own storage folder',
  !sellerUpload.error,
  sellerUpload.error?.message,
);

const imageAttach = await seller.rpc('replace_listing_images', {
  p_listing_id: listingId,
  p_images: [{ path: storagePath, alt: 'Test cycle' }],
});
check(
  'seller can attach an image atomically',
  imageAttach.data?.imageCount === 1,
  imageAttach.error?.message,
);

const buyerImageAttach = await buyer.rpc('replace_listing_images', {
  p_listing_id: listingId,
  p_images: [{ path: storagePath }],
});
check(
  'buyer cannot replace another seller images',
  Boolean(buyerImageAttach.error),
  buyerImageAttach.error?.message,
);

const buyerUpload = await buyer.storage
  .from('listing-images')
  .upload(`${sellerUser.id}/evil-${stamp}.png`, png, { contentType: 'image/png' });
check(
  'buyer cannot upload into the seller storage folder',
  Boolean(buyerUpload.error),
  buyerUpload.error?.message,
);

const sellerListing = await seller.rpc('get_listing', { p_id: listingId });
check('seller listing is marked as mine', sellerListing.data?.isMine === true);
check('attached image is returned', sellerListing.data?.images?.[0]?.path === storagePath);

const removed = await seller.rpc('remove_listing', { p_id: listingId });
check('seller can soft-remove their listing', removed.data?.ok === true);
const hiddenFromFeed = await anon.rpc('get_feed', { p_city_id: 'city-khargone' });
check(
  'removed listing leaves the public feed',
  !hiddenFromFeed.data?.items?.some((item) => item.id === listingId),
);

const output = {
  sellerEmail,
  buyerEmail,
  password,
  sellerId: sellerUser.id,
  buyerId: buyerUser.id,
  listingId,
  conversationId,
  storagePath,
};
fs.writeFileSync(
  `${process.env.TEMP || '.'}/purana-bazaar-phase1-users.json`,
  JSON.stringify(output, null, 2),
);

console.log(`\n${passed} passed, ${failures.length} failed`);
console.log(`Test users saved to %TEMP%\\purana-bazaar-phase1-users.json`);
if (failures.length) {
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exitCode = 1;
}

-- Purana Bazaar — Phase 1 storage bucket and reference data.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-images',
  'listing-images',
  true,
  1048576,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "listing images are publicly readable"
  on storage.objects for select
  to public
  using (bucket_id = 'listing-images');

create policy "users upload listing images to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users update listing images in their own folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users delete listing images in their own folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Reference data: all cities are seeded, but only Khargone is visible at launch.
insert into public.cities (id, slug, name, name_hi, state, is_active, is_launch, sort_order)
values
  ('city-khargone', 'khargone', 'Khargone', 'खरगोन', 'Madhya Pradesh', true, true, 1),
  ('city-sendhwa', 'sendhwa', 'Sendhwa', 'सेंधवा', 'Madhya Pradesh', false, false, 2),
  ('city-bistan', 'bistan', 'Bistan', 'बिस्टान', 'Madhya Pradesh', false, false, 3),
  ('city-khandwa', 'khandwa', 'Khandwa', 'खंडवा', 'Madhya Pradesh', false, false, 4),
  ('city-dhar', 'dhar', 'Dhar', 'धार', 'Madhya Pradesh', false, false, 5),
  ('city-indore', 'indore', 'Indore', 'इंदौर', 'Madhya Pradesh', false, false, 6),
  ('city-bhopal', 'bhopal', 'Bhopal', 'भोपाल', 'Madhya Pradesh', false, false, 7),
  ('city-ujjain', 'ujjain', 'Ujjain', 'उज्जैन', 'Madhya Pradesh', false, false, 8)
on conflict (id) do update
set slug = excluded.slug,
    name = excluded.name,
    name_hi = excluded.name_hi,
    state = excluded.state,
    is_active = excluded.is_active,
    is_launch = excluded.is_launch,
    sort_order = excluded.sort_order;

insert into public.categories (id, slug, name_en, name_hi, sort_order, attributes_schema)
values
  ('cat-mobiles', 'mobiles', 'Mobiles', 'मोबाइल', 1, '[{"key":"Brand","type":"text"},{"key":"Storage","type":"text"},{"key":"Battery health","type":"text"},{"key":"Box","type":"boolean"}]'::jsonb),
  ('cat-laptops', 'laptops', 'Laptops', 'लैपटॉप', 2, '[{"key":"Brand","type":"text"},{"key":"Processor","type":"text"},{"key":"RAM","type":"text"},{"key":"Storage","type":"text"}]'::jsonb),
  ('cat-furniture', 'furniture', 'Furniture', 'फर्नीचर', 3, '[{"key":"Material","type":"text"},{"key":"Size","type":"text"}]'::jsonb),
  ('cat-appliances', 'appliances', 'Appliances', 'घरेलू उपकरण', 4, '[{"key":"Brand","type":"text"},{"key":"Capacity","type":"text"},{"key":"Type","type":"text"}]'::jsonb),
  ('cat-bikes', 'bikes', 'Bikes', 'बाइक', 5, '[{"key":"Year","type":"text"},{"key":"KM driven","type":"text"},{"key":"Owner","type":"text"},{"key":"Insurance","type":"text"}]'::jsonb),
  ('cat-cycles', 'cycles', 'Cycles', 'साइकिल', 6, '[{"key":"Brand","type":"text"},{"key":"Gears","type":"text"},{"key":"Frame","type":"text"}]'::jsonb),
  ('cat-books', 'books', 'Books', 'किताबें', 7, '[{"key":"Class","type":"text"},{"key":"Subject","type":"text"},{"key":"Language","type":"text"}]'::jsonb),
  ('cat-home-kitchen', 'home-kitchen', 'Home & kitchen', 'रसोई और घर', 8, '[{"key":"Brand","type":"text"},{"key":"Power","type":"text"},{"key":"Material","type":"text"}]'::jsonb),
  ('cat-other', 'other', 'Other', 'अन्य', 9, '[]'::jsonb)
on conflict (id) do update
set slug = excluded.slug,
    name_en = excluded.name_en,
    name_hi = excluded.name_hi,
    sort_order = excluded.sort_order,
    attributes_schema = excluded.attributes_schema;

insert into public.promotion_products (id, code, name, kind, duration_days, price_inr, is_active, sort_order)
values
  ('boost-7d', 'listing_boost_7d', '7-day listing boost', 'listing_boost', 7, 49, true, 1),
  ('dealer-30d', 'dealer_boost_30d', '30-day dealer boost', 'dealer_boost', 30, 199, true, 2)
on conflict (id) do update
set code = excluded.code,
    name = excluded.name,
    kind = excluded.kind,
    duration_days = excluded.duration_days,
    price_inr = excluded.price_inr,
    is_active = excluded.is_active,
    sort_order = excluded.sort_order;

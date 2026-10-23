-- Enable Supabase Realtime for chat and notification tables.
--
-- The default `supabase_realtime` publication has no tables registered, so
-- `postgres_changes` subscriptions on public.messages / public.notifications /
-- public.conversations would never deliver. Adding them here lets the browser
-- client receive live message and notification events (RLS still gates reads).
alter publication supabase_realtime add table public.messages, public.notifications, public.conversations;

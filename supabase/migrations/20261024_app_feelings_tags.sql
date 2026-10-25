-- Lets the mobile app's records round-trip through pain_marks.
-- Apply after schema.sql. Check the enum's real name first (\dT in psql) if it isn't `pain_type`.

-- The app's feeling picker offers these three; schema.sql didn't have them.
alter type pain_type add value if not exists 'sharp';
alter type pain_type add value if not exists 'stiffness';
alter type pain_type add value if not exists 'swelling';

-- Free-text chips from the app ('Period', 'headache', ...). `context` is a fixed enum, so they can't go there.
alter table pain_marks add column if not exists tags text[] not null default '{}';

-- The app creates ids itself and saves with upsert, so RLS needs insert AND update for the owner, e.g.:
--   create policy "own marks insert" on pain_marks for insert with check (user_id = auth.uid());
--   create policy "own marks update" on pain_marks for update using (user_id = auth.uid());

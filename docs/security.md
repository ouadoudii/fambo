# Fambo security model

- Public GitHub repository contains **no** student identifiers, usernames, tokens, or service role keys.
- Supabase Auth signs users up with email/password. Email confirmation is enabled in Supabase.
- Family settings are stored in `family_plans` with Row Level Security, restricted to `auth.uid() = user_id` for reads and writes.
- Vercel must not remove deployment protection until production smoke tests confirm registration/login/logout and account separation.
- No unauthenticated calendar API endpoint: `api/timetable` verifies access token through Supabase Auth then reads exclusively that user's saved calendar URL (indexed by child slot).
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` configured in Vercel environment. Anon key is public, service role key must never be used.
- The originally public pupil link remains in historical Git commits. Coordinate rotation of shared WebUntis link if school allows.

# Relay

India-first hiring marketplace prototype: people looking for work + people hiring.

## Run

This is a plain multi-page HTML/CSS/JS site. Open `index.html` directly or serve the folder with any static web server.

## Supabase

The frontend includes a Supabase-ready client layer. The connected Supabase account currently exposes no project through the connector, so the site safely runs in local demo mode until a project is available.

When the project is ready:

1. Run `supabase/schema.sql` in the Supabase SQL editor.
2. Add the project URL and publishable key to `assets/js/config.js`.
3. The existing auth/job hooks will use Supabase when configured.

Never put a service-role key in browser code. Only a publishable/anon key belongs in a static frontend.

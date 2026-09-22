# Relay

India-first hiring marketplace for adults looking for work and people hiring.

## Current product rules

- Relay currently accepts users who are 18+.
- No seeded jobs, companies, reviews, applicants, messages, or activity are included.
- Marketplace data comes from Supabase.
- Email/password authentication is live through Supabase Auth.
- Google OAuth is wired in the frontend but requires Google OAuth credentials to be enabled in Supabase.

## Supabase project

Relay is connected to the Supabase project `relay`.

The database schema and RLS policies are in `supabase/schema.sql` and have been applied to the project. The frontend uses the project's publishable key in `assets/js/config.js`; never put a Supabase service-role key in browser code.

## Enable Google sign-in

Supabase requires a Google OAuth client ID and client secret before the Google provider can authenticate users. In Supabase Dashboard, open Authentication → Providers → Google and enable it with credentials from Google Cloud's OAuth configuration.

For the Google OAuth application:

1. Add the final Relay website origin as an authorized JavaScript origin.
2. Add the Supabase Auth callback URL shown on the Supabase Google provider page as an authorized redirect URI.
3. Save the Google client ID and secret in the Supabase Google provider settings.
4. In Supabase URL Configuration, set the production Site URL and add the Relay `auth-callback.html` URL to the allowed redirect URLs.

Supabase's current Google setup documentation: https://supabase.com/docs/guides/auth/social-login/auth-google

## GitHub Pages

The site is a plain static build and needs no build step:

Repository → Settings → Pages → Build and deployment → Deploy from a branch → `main` / `/ (root)`.

## Legal

Relay includes product-ready drafts for Terms, Privacy, Safety, and Cookie/Storage notices. They should be reviewed by an India-qualified lawyer before public launch, together with the actual data flows, moderation process, user-support process, and business entity details.

# RELAY

RELAY is an India-only hiring marketplace for adults 18+.

The product has two sides:
- people looking for work
- people hiring

## Stack

- Static HTML/CSS/JavaScript frontend
- Supabase Auth
- Supabase PostgreSQL
- Supabase Realtime
- GitHub Pages-compatible deployment

## Live data policy

The public marketplace is intentionally empty until real users publish real profiles and openings. The repository contains no seeded jobs, applicants, companies, testimonials, ratings, or activity.

## Supabase

The current frontend is configured for the Relay project:

- Project: `relay`
- URL: `https://jeorjtyzstmlpdszwgfn.supabase.co`
- Browser key: publishable key only

Never place a Supabase service-role key in the frontend.

Run `supabase/schema.sql` in a fresh project. The live project has already received the same production migrations.

## Google sign-in

In Supabase:

1. Authentication → Providers → Google.
2. Create a Google OAuth Web Application client in Google Cloud.
3. Add the Relay production origin to Authorized JavaScript origins.
4. Add the Supabase Google callback shown in the provider screen to Authorized redirect URIs.
5. Paste the Google Client ID and Client Secret into the Supabase Google provider and enable it.
6. Add the Relay callback URL to Supabase's redirect allow list:
   `https://<your-relay-domain>/auth-callback.html?flow=google`

The site already calls `signInWithOAuth({ provider: 'google' })`; no frontend switch is required after the provider is enabled.

## Auth email branding

Supabase's built-in SMTP is intended for development/testing and is not suitable for public production delivery. For production auth email, configure custom SMTP in:

Authentication → Emails → SMTP Settings

Set the sender name to:

`Relay`

Use a From address on a domain you control, then use the branded templates in:

`supabase/email-templates/confirmation.html`
`supabase/email-templates/recovery.html`

This is what changes emails from the generic Supabase-auth presentation to Relay-branded delivery.

## Production security

Supabase Security Advisor should be reviewed regularly. The current database security findings are limited to the Auth setting for leaked-password protection; enable that from the Supabase Auth password security settings before public launch.

## Pages

Core product pages include:
`index.html`
`jobs.html`
`job.html`
`login.html`
`signup.html`
`onboarding.html`
`dashboard.html`
`applications.html`
`messages.html`
`profile.html`
`talent.html`
`talent-profile.html`
`post-job.html`
`edit-job.html`
`saved.html`
`settings.html`
`report.html`
`help.html`
plus policy and legal pages.

## Important launch items

The legal pages are product drafts. Before public launch, replace any development-only operator/contact language with your real legal entity, support contact, grievance contact, and final retention/deletion process. Review the policies against your final business structure and data processing practices.

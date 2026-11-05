# Rotten Peters

A movie discovery app built with Next.js, TypeScript, and Tailwind CSS. Search OMDb and open movie details, or sign in with Google or email through Supabase Auth.

## Get started

1. Copy `.env.example` to `.env.local`.
2. Request an OMDb API key at [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx) and set `OMDB_API_KEY` in `.env.local`. Keep this key private; it is used only by server-side code.
3. Create a Supabase project and set its project URL and public anon key in `.env.local`:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
   ```

   The anon key is intentionally public and is safe for browser use. Never put a Supabase service-role/secret key or Google provider secret in a `NEXT_PUBLIC_` variable or browser code.
4. Configure the Supabase and provider dashboards as described below. OAuth does not work until valid provider credentials and redirect URLs are configured.
5. Install dependencies and start the development server:

   ```bash
   npm install
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000).

Search from the home page and select a result to see its details. Movie data is provided by the [OMDb API](https://www.omdbapi.com/). Sign-in is optional and does not restrict movie search or detail pages. Email accounts use a password and a username saved in the Supabase Auth user metadata. A username may be 3–24 letters, numbers, or underscores, or an email address.

## Supabase and OAuth dashboard setup

These are external dashboard steps; the app code cannot create provider credentials or enable OAuth by itself.

Email/password sign-up and password recovery are enabled by default in Supabase Auth. On hosted projects, email confirmation is on by default. Keep confirmation enabled for production and configure **Authentication → URL Configuration** as above. Supabase's default email service is for testing only: it delivers only to addresses on your Supabase organization's team and is limited to about two messages per hour. To send confirmation and password-reset emails to other people, configure a custom SMTP provider in **Authentication → SMTP Settings**. Check **Authentication → Logs** for delivery errors. The callback page exchanges the confirmation/recovery code and returns the user to the app. A user who must confirm their email should follow the emailed link, then sign in with their email and password.

To enforce unique usernames, run [`supabase/username-uniqueness.sql`](./supabase/username-uniqueness.sql) in the Supabase SQL Editor. It creates a private profile table, a case-insensitive unique index, a username availability function, and an Auth trigger that prevents duplicate usernames even if two sign-ups race. The sign-up form reports an email already in use when Supabase returns its duplicate-sign-up response. This reveals whether an email has an account; keep that tradeoff in mind if account-enumeration resistance is important for your app.

### Supabase Auth URLs

In the Supabase project, open **Authentication → URL Configuration**:

- Set **Site URL** to the production app origin, such as `https://your-domain.example`.
- Add these exact app callback URLs to **Redirect URLs**:
  - Local: `http://localhost:3000/auth/callback`
  - Local password reset: `http://localhost:3000/auth/callback?next=/reset-password`
  - Production: `https://your-domain.example/auth/callback`
  - Production password reset: `https://your-domain.example/auth/callback?next=/reset-password`
- If the app runs locally on another port or at another hostname, add that exact callback URL too. Avoid broad production wildcards.

The app's `/auth/callback` URL is the final redirect back to the website. Google also needs the Supabase Auth callback URL below.

### Google

1. In Google Cloud Console, configure the OAuth consent screen (app name, audience, and the `openid`, `email`, and `profile` scopes).
2. Create an OAuth client ID with application type **Web application**.
3. Add authorized JavaScript origins for `http://localhost:3000` and the production app origin.
4. Add the Supabase project's callback URL to Google's **Authorized redirect URIs**. This must be the Supabase callback, not your local app callback. Find the exact value under **Supabase → Authentication → Providers → Google**; it has this form:
   `https://<project-ref>.supabase.co/auth/v1/callback`
5. Enable Google under **Supabase → Authentication → Providers → Google** and enter the Google OAuth client ID and client secret there. Keep the provider secret in Supabase, not in this app's environment variables.

## Available scripts

- `npm run dev` — start the development server
- `npm run build` — create a production build
- `npm run lint` — run ESLint
- `npx tsc --noEmit` — run the TypeScript check
- `npm run start` — serve the production build

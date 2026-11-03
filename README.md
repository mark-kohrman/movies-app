# Rotten Peters

A movie discovery app built with Next.js, TypeScript, and Tailwind CSS. The first slice lets you search OMDb and open a movie detail page.

## Get started

1. Copy `.env.example` to `.env.local`.
2. Request an OMDb API key at [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx).
3. Add the key to `.env.local`:

   ```dotenv
   OMDB_API_KEY=your_omdb_api_key
   ```

   Keep this key private. It is read only by server-side code and must not use a `NEXT_PUBLIC_` prefix.

4. Install dependencies and start the development server:

   ```bash
   npm install
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

Search from the home page and select a result to see its details. Movie data is provided by the [OMDb API](https://www.omdbapi.com/).

## Available scripts

- `npm run dev` — start the development server
- `npm run build` — create a production build
- `npm run start` — serve the production build
- `npm run lint` — run ESLint

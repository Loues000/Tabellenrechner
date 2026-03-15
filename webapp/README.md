# `webapp`

This workspace contains the production Next.js application behind the Tabellenrechner deployment on Vercel.

## Production

- Live app: `https://tabellenrechner.vercel.app/`
- Vercel root directory: `webapp`

## Responsibilities

- Render the Tabellenrechner UI in `src/app/page.tsx`.
- Expose server routes in `src/app/api/*` for URL imports and WAM-backed competition search.
- Parse and normalize legacy `fussball.de` competition data in `src/lib/fussballde/*`.
- Recalculate the live table in `src/lib/table-calculator.ts`.

## Commands

From this folder:

```bash
npm install
npm run dev
npm run lint
npm run test
npm run build
```

The development server runs on `http://localhost:3001`.

## Structure

```text
src/
  app/
    api/
      competition/route.ts
      search/bootstrap/route.ts
      search/competitions/route.ts
    globals.css
    layout.tsx
    page.tsx
  lib/
    fussballde/
      font-decoder.ts
      legacy.ts
      search.ts
      types.ts
    table-calculator.test.ts
    table-calculator.ts
```

For repository-level context, samples, and task tracking, see the root `README.md`.

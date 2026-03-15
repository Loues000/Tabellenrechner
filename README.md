# Tabellenrechner

Standalone web app for importing amateur football competitions from `fussball.de` and recalculating the table after manual result edits, similar to the Kicker Tabellenrechner.

## Scope

- Import a competition via direct `fussball.de` URL.
- Discover competitions via the legacy WAM filter endpoints.
- Parse standings and all matchdays from legacy `fussball.de` pages.
- Decode obfuscated kickoff times and scores via the published font files.
- Let users edit results client-side and recalculate the live table immediately.
- Keep parser, decoder, search, and calculation logic separate so the core can be reused later.

V1 does not include user accounts or persistence.

## Workspace

The application lives in `webapp`.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Cheerio for legacy HTML parsing
- Fontkit for `fussball.de` obfuscation-font decoding
- Vitest for calculation tests

## Project Layout

```text
samples/
  fussballde/
    html/                              # captured legacy pages and ajax fragments
    css/                               # extracted obfuscation-related stylesheets
    fonts/                             # obfuscation fonts used for decoding
    wam/                               # captured WAM endpoint JSON responses
webapp/
  src/app/
    api/competition/route.ts           # URL import endpoint
    api/search/bootstrap/route.ts      # WAM filter bootstrap endpoint
    api/search/competitions/route.ts   # WAM competition chooser endpoint
    page.tsx                           # Tabellenrechner UI
  src/lib/fussballde/
    legacy.ts                          # legacy page parser and importer
    search.ts                          # WAM bootstrap + competition search
    font-decoder.ts                    # obfuscation font decoding
    types.ts                           # shared import/result/table types
  src/lib/
    table-calculator.ts                # live table recomputation
    table-calculator.test.ts           # ranking/result override tests
```

Captured `fussball.de` fixtures used during parser and decoder development live under `samples/fussballde/`, grouped by content type instead of sitting in the repository root.

## Local Development

Requirements:

- Node.js 20+
- npm

Install and run:

```bash
cd webapp
npm install
npm run dev
```

Then open `http://localhost:3000`.

Useful commands:

```bash
cd webapp
npm run lint
npm run test
npm run build
```

## How It Works

1. The UI either accepts a competition URL or loads filter defaults from `fussball.de/wam_base.json` and related WAM JSON endpoints.
2. The server fetches the selected legacy `fussball.de` competition page and resolves the available matchdays.
3. The importer parses the published table and all fixtures from the legacy markup.
4. Obfuscated date, kickoff, and score text is decoded with the referenced font files.
5. The client keeps edited results in local state and recalculates the standings from the normalized match list.

If the importer cannot parse the source structurally, the app returns a clear error instead of silently degrading.

## Current Status

Implemented today:

- URL import and WAM-based competition search
- Legacy standings and matchday normalization
- Obfuscation font decoding for dates and scores
- Editable result overrides with instant table recalculation
- Unit coverage for calculator behavior around imported results and overrides

## Notes

- `fussball.de` legacy markup and WAM endpoints are external dependencies and may change without notice.
- The app currently fetches live upstream data at request time and does not cache imported competitions.
- This project is not affiliated with `fussball.de` or Kicker.

# Tabellenrechner

Standalone web app for importing amateur football competitions from `fussball.de` and recalculating the table after manual result edits, similar to the Kicker Tabellenrechner.

## Live App

- Production: `https://tabellenrechner.vercel.app/`
- Repository: `https://github.com/Loues000/Tabellenrechner`

The app is now deployed on Vercel. The old GitHub Pages fallback is no longer the primary way to access the project.

## Scope

- Import a competition via direct `fussball.de` URL.
- Discover competitions via the legacy WAM filter endpoints.
- Parse standings and all matchdays from legacy `fussball.de` pages.
- Decode obfuscated kickoff times and scores via the published font files.
- Let users edit results client-side and recalculate the live table immediately.
- Keep parser, decoder, search, and calculation logic separate so the core can be reused later.

V1 does not include user accounts or persistence.

## Repository Structure

```text
.
+-- index.html                         # static handoff page with links to the live app and repo
+-- samples/
|   `-- fussballde/
|       |-- css/                      # captured obfuscation-related stylesheets
|       |-- fonts/                    # font files used for decoding
|       |-- html/                     # captured legacy competition pages and fragments
|       `-- wam/                      # captured WAM endpoint responses
+-- tasks/
|   |-- lessons.md                    # durable implementation and deployment lessons
|   `-- todo.md                       # current task tracking
`-- webapp/
    |-- public/                       # static assets
    |-- src/
    |   |-- app/
    |   |   |-- api/
    |   |   |   |-- competition/route.ts   # URL import endpoint
    |   |   |   |-- search/bootstrap/route.ts
    |   |   |   `-- search/competitions/route.ts
    |   |   |-- globals.css
    |   |   |-- layout.tsx
    |   |   `-- page.tsx              # Tabellenrechner UI
    |   `-- lib/
    |       |-- fussballde/
    |       |   |-- font-decoder.ts
    |       |   |-- legacy.ts
    |       |   |-- search.ts
    |       |   `-- types.ts
    |       |-- table-calculator.test.ts
    |       `-- table-calculator.ts
    |-- package.json
    `-- README.md                     # workspace-specific commands and notes
```

The application itself still lives in `webapp`. Root-level npm scripts proxy into that workspace so the repo can be started from the top level.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Cheerio for legacy HTML parsing
- Fontkit for `fussball.de` obfuscation-font decoding
- Vitest for calculation tests

## Local Development

Requirements:

- Node.js 20.x
- npm

Install and run from the repository root:

```bash
npm install
npm run dev
```

Then open `http://localhost:3001`.

Useful commands:

```bash
npm run lint
npm run test
npm run build
```

You can also work directly inside `webapp/` if you prefer. The root scripts simply forward to that package.

## Deployment

Production is deployed on Vercel from the `webapp` root directory.

- Framework preset: `Next.js`
- Root Directory: `webapp`
- Node.js: `20.x`

If you create another Vercel project from this repository, keep the same settings:

```text
https://vercel.com/new/clone?repository-url=https://github.com/Loues000/Tabellenrechner&root-directory=webapp
```

The root `index.html` remains as a lightweight static handoff page. The real importer depends on Next.js server routes under `webapp/src/app/api/*`, so a pure static host cannot run the full app.

## How It Works

1. The UI either accepts a competition URL or loads filter defaults from `fussball.de/wam_base.json` and related WAM JSON endpoints.
2. The server fetches the selected legacy `fussball.de` competition page and resolves the available matchdays.
3. The importer parses the published table and all fixtures from the legacy markup.
4. Obfuscated date, kickoff, and score text is decoded with the referenced font files.
5. The client keeps edited results in local state and recalculates the standings from the normalized match list.

If the importer cannot parse the source structurally, the app returns a clear error instead of silently degrading.

## Current Status

- URL import and WAM-based competition search are implemented.
- Legacy standings and matchday normalization are implemented.
- Obfuscation font decoding for dates and scores is implemented.
- Editable result overrides recalculate the table immediately.
- Unit coverage exists for calculator behavior around imported results and overrides.

## Notes

- `fussball.de` legacy markup and WAM endpoints are external dependencies and may change without notice.
- The app currently fetches live upstream data at request time and does not cache imported competitions.
- This project is not affiliated with `fussball.de` or Kicker.

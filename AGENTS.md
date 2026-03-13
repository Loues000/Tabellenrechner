# Agent Instructions (Repo)

## Project Summary

- Goal: Build a standalone web app that imports amateur football competitions from `fussball.de` and provides a Kicker-like Tabellenrechner with editable match results and a recalculated live table.
- Reference UX sample: `https://www.kicker.de/bundesliga/tabellenrechner` (checked March 13, 2026).
- App location: `webapp`
- Stack: `Next.js`, `TypeScript`, server-side HTML parsing for `fussball.de`, client-side React UI.
- Primary data sources:
  - Legacy `fussball.de` competition pages and Ajax fragments for clear-text table/search data.
  - `fussball.de` obfuscation fonts for decoding match dates, kickoff times, and scores.
- Constraints:
  - Prefer robust import logic over brittle DOM shortcuts.
  - Keep parser, decoder, search, and table calculation isolated so a future browser extension can reuse the same core logic.
  - V1 has no user accounts or persistence.

## Session Start Checklist

1. Read this file once before significant work.
2. Review `tasks/lessons.md`.
3. Review/update `tasks/todo.md`.
4. Confirm the app workspace still lives in `webapp`.
5. Use `frontend-design` for UI implementation and `web-design-guidelines` only when doing an explicit audit/review.

## Operating Rules

- Work in small, shippable slices.
- Prefer correctness of parsing and score decoding over feature breadth.
- Treat `fussball.de` markup, Ajax endpoints, and obfuscation fonts as unstable external dependencies and keep the adapter easy to replace.
- If the importer fails for structural reasons, preserve the rest of the UI and show a clear error instead of silently falling back.
- Ralph Wiggum Loop: after 3 failed attempts on the same bug/build/test issue, stop and ask Luis for a different approach.

## Planning Default

Any non-trivial change starts with planning.

- Keep `tasks/todo.md` current.
- Re-plan immediately if `fussball.de` markup or assumptions invalidate the current approach.
- Acceptance criteria should be specific and verifiable.

## Skills

### Active Skills For This Project

- `frontend-design`

### Skill Usage Rules

- Web UI implementation or redesign: always use `frontend-design`.
- Web accessibility/guidelines review: use `web-design-guidelines`.
- Only run `find-skills` if a new external integration or workflow appears that is not already covered.

## Verification

- Do not mark work done without at least one of:
  - `npm run lint`
  - `npm run test`
  - `npm run build`
- For parser changes, verify against a real `fussball.de` competition URL when possible.
- For table logic changes, keep unit tests around result overrides, future fixtures, and ranking order.

## Change Packaging

- Keep parser/decoder changes separate in intent from UI styling when practical.
- Do not create commits unless explicitly requested.

## Definition Of Done

- The app in `webapp` starts and renders the Tabellenrechner UI.
- A `fussball.de` competition can be loaded via URL or via the WAM-based league chooser.
- The imported table and matchdays are normalized into internal types.
- Editing match results recalculates the table immediately.
- Core calculation logic has at least one automated test.

## Task Management Protocol

1. Initialize or update `tasks/todo.md`.
2. Execute work and flip `[ ]` to `[x]`.
3. Record durable lessons in `tasks/lessons.md` when a real mistake or bug was fixed.
4. Summarize changes and verification at the end.

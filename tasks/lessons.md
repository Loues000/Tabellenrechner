# Lessons

- The WAM search bootstrap should retry transient upstream failures and stop early when a selected filter branch has no downstream options; otherwise the UI can surface avoidable 500s from invalid follow-up requests.
- Keep official table adjustments separate from raw result aggregation; otherwise the zero-edit table and movement indicators can drift away from the imported fussball.de baseline.
- GitHub Pages can only serve the repository as static files; a Next.js app that depends on `src/app/api` routes needs a server-capable deployment target, so the root Pages site should explain that instead of falling back to the README render.
- For Vercel deployments from this repository, the correct project root is `webapp`; trying to deploy from the repo root risks missing Next.js auto-detection and can pick an unintended Node major unless `engines.node` is pinned.
- Once the production deployment exists on Vercel, the root README, workspace README, and any static handoff page should link to the live domain first; otherwise the repository keeps advertising the retired fallback hosting path.
- Horizontal touch/trackpad rails need both wheel interception and `touch-action`/`overscroll-behavior` guards; handling only mouse drag still lets the page scroll-chain while users navigate the rail.
- When fixing German UI copy on Windows, verify suspect strings by reading the source as UTF-8 before editing; PowerShell output can show mojibake even when the file content is already correct.
- `fussball.de` can emit repeated `spielfrei` fixtures without detail links, so imported match IDs need a collision-safe fallback instead of relying on matchday plus team names alone.

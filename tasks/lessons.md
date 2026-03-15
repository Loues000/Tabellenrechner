# Lessons

- The WAM search bootstrap should retry transient upstream failures and stop early when a selected filter branch has no downstream options; otherwise the UI can surface avoidable 500s from invalid follow-up requests.
- Keep official table adjustments separate from raw result aggregation; otherwise the zero-edit table and movement indicators can drift away from the imported fussball.de baseline.
- GitHub Pages can only serve the repository as static files; a Next.js app that depends on `src/app/api` routes needs a server-capable deployment target, so the root Pages site should explain that instead of falling back to the README render.
- For Vercel deployments from this repository, the correct project root is `webapp`; trying to deploy from the repo root risks missing Next.js auto-detection and can pick an unintended Node major unless `engines.node` is pinned.

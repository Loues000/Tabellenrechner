## fussball.de samples

This directory keeps captured upstream fixtures used during development of the importer and decoder.

- `html/`: legacy competition pages, table views, widgets, match pages, and ajax fragments
- `css/`: obfuscation-related stylesheets referenced by the captured pages
- `fonts/`: published fonts used to decode dates, kickoff times, and scores
- `wam/`: WAM search bootstrap and competition chooser JSON payloads

The files are snapshots of unstable upstream dependencies, so they are intentionally kept separate from the application source in `webapp/`.

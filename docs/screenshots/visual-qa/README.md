# Visual QA pass (integration)

Full-page captures at 390, 1024, and 1440 in light and dark:

```bash
# Prereq: demo worker :8787, built web preview :4173 (VITE_API_URL=http://127.0.0.1:4173)
OUT_SUBDIR=before node scripts/visual-qa-pass.mjs
OUT_SUBDIR=after node scripts/visual-qa-pass.mjs
```

Highlight crops (five biggest fixes):

```bash
OUT_SUBDIR=before node scripts/visual-qa-highlights.mjs
OUT_SUBDIR=after node scripts/visual-qa-highlights.mjs
```

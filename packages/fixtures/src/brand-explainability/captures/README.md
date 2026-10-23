# Qloo explainability captures

Raw API bodies for demo Why cards (`filter.type=urn:tag` and `urn:audience` with `signal.interests.entities` + `signal.location`).

Regenerate with a live hackathon key (never commit the key):

```bash
QLOO_API_KEY=... node scripts/record-brand-explainability-fixture.mjs boulder wicker sevierville
```

The script writes both `captures/*.json` envelopes and normalized `../*.json` fixtures. Do not hand-edit affinity values; replace captures via the recorder.

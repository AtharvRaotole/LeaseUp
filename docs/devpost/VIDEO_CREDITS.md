# LeaseUp demo video: credits and licenses

## Voiceover
* Synthetic voice made with **Kokoro-82M** (hexgrad), model weights under the **Apache License 2.0**. Voice: `af_heart`, speed 0.94.
* Run locally with **kokoro-onnx** 0.6.1 (thewh1teagle), **MIT License**, using the `kokoro-v1.0.onnx` and `voices-v1.0.bin` files.
* Processed with FFmpeg: high pass, gentle EQ, de-esser and light compression. The final mix is normalized to -16 LUFS.
* No paid TTS API was used. The voice is synthetic and is not a real person.

## Music
* **Original procedural ambient score** written for this video in Python (NumPy and SciPy, script `_build/music.py`). It uses no samples or third party recordings.
* Released by the author under **CC0 1.0** (public domain dedication).
* Ducked about 22 dB under the voice.

## Fonts
* **Source Sans 3** (Adobe), **SIL Open Font License 1.1**, from the @fontsource package.

## Footage
* Screen recordings of the live LeaseUp app (https://leaseup-59m.pages.dev) on Oct 26, 2026, on production build deploy50 (worker gitSha 0b1154d).
* One live search (Bedford Ave, Brooklyn; job 0e1a45d0), run after deploy50 went live. Its six tool step run is shown at 2x speed and labeled that way.
* The Wicker Park, Chicago and Boulder pitch brief segments use LeaseUp's built in recorded demo reports. They are labeled as recorded demos.
* Map tiles and store data in the app: OpenStreetMap contributors (ODbL) and All The Places (CC0). Taste data from the Qloo Taste AI API.

## Tools
* Playwright (Apache 2.0) for capture and compositing, FFmpeg (LGPL/GPL) for encoding, faster-whisper (MIT) for the caption and sync QA.

## Numbers
Every number shown or spoken comes from the production app or from the repo docs `docs/devpost/SUBMISSION_PACK.md` and `docs/RUBRIC_AUDIT_DEPLOY50.md`.

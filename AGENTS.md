# AGENTS.md

Guidelines for AI coding assistants working on this repository.

## Project

CatifyMe — upload a selfie, get a cartoon cat that matches your vibe.
Static frontend (vanilla HTML/CSS/JS), powered by Puter.js (user-pays model, $0 for developer).

## Stack

- Vanilla HTML5 + CSS3 + ES modules (no build step, no framework)
- Puter.js loaded via CDN: `<script src="https://js.puter.com/v2/"></script>`
- Mobile-first, dark theme with warm accent colors
- i18n: RU + EN, auto-detect via `navigator.language`, persisted in `localStorage` (`catifyme-lang`)

## Architecture

```
index.html        # markup + inline critical CSS
styles.css        # main styles (mobile-first, dark theme)
app.js            # entry, ES module, orchestrates flow
locales/{ru,en}.json
assets/           # og-image, favicon, placeholders
```

Key user flow:
1. Upload selfie (FileReader → base64 dataURL)
2. Friendly explainer bottom-sheet → `puter.auth.signIn()`
3. `puter.ai.chat(visionPrompt, imageDataURL, {model: 'gpt-4o'})` → JSON `{breed, name, fun_fact, img_prompt}`
4. `puter.ai.txt2img(img_prompt, {model: 'dall-e-3'})` → `<img>`
5. Result card with Download / Share (canvas watermark + Web Share API)

## Commit conventions

Conventional Commits, strictly:

```
<type>(<optional scope>): <imperative, lowercase, no trailing period>
```

Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `perf`, `test`, `ci`
Scope: optional, lowercase, single word (e.g. `ui`, `puter`, `share`, `i18n`, `seo`, `ux`, `readme`)

Examples matching repo history:
- `feat(puter): integrate vision analysis of selfie`
- `fix(share): fallback when Web Share API unavailable`
- `chore: bump deps`
- `docs(readme): add deploy guide`

Body (optional): wrap at 72 chars, explain "what" + "why" (not "how").
No Claude/Co-authored-by trailers unless explicitly requested.

## Before committing

- Verify no secrets, API keys, or personal data are staged.
- No `console.log` in committed code (use a `DEBUG` flag if needed).
- No commented-out code blocks.
- Run `git status` + `git diff --staged` before each commit.

## Deployment

Vercel (static). Auto-deploys from `main` on push.
Project URL: `catifyme.vercel.app`

Do not commit `.vercel/` or any local config.

## Testing

- Runner: `node --test` (Node 20+, built-in, no dependencies)
- Run: `npm test` or `node --test test/`
- Tests in `test/`, mocks in `test/helpers/`
- CI: GitHub Actions on every push/PR (`.github/workflows/test.yml`)
- Key test: `puter-api.test.js` verifies image is passed via `puter_path`,
  not raw dataURL — prevents regression of the multimodal API call bug.

## License

MIT. All contributions accept the same license.

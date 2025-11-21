# Frontend Template — Tailwind CDN

This is a minimal, easily-editable frontend template that uses Tailwind via CDN, Google Fonts, and Font Awesome (icons).

Files:
- `index.html` — main editable page (Tailwind classes everywhere).
- `components.html` — showcase of reusable components (navbar, footer, forms, cards, modals, alerts, buttons, etc.).
- `src/styles.css` — small custom CSS overrides.
- `src/main.js` — tiny JS helpers (year, theme toggle example).
- `assets/logo.svg` — placeholder logo you can replace.

Quick start:

1. Open `index.html` in your browser. No build step required.

2. (Optional) Run a local static server to test routing and avoid CORS issues:

```powershell
# from project root (r:\FRONTEND)
python -m http.server 3000; Start-Process "http://localhost:3000"
```

3. Editing tips:
- Use Tailwind utility classes directly in `index.html` and `components.html`.
- Browse `components.html` for ready-to-use components (navbar, forms, cards, modals, etc.). Copy & paste into your pages.
- Change fonts via the Google Fonts link in the `<head>`.
- Replace `assets/logo.svg` with your SVG or image.
- If you prefer a local Tailwind build (recommended for production), follow Tailwind docs to install `tailwindcss` and replace CDN usage.

Notes:
- Tailwind CDN is great for prototypes and editing; for production builds use PostCSS + Tailwind to purge unused CSS.

Want me to:
- Add a local Tailwind `package.json` + build scripts? (yes/no)
- Scaffold a few reusable components (nav, modal, card)? (yes/no)

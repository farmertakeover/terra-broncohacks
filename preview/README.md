# Preview build

This directory is a live design-preview deploy. **Production lives at `..`** (the repo root).

- Production URL: `https://farmertakeover.github.io/terra-broncohacks/`
- Preview URL:    `https://farmertakeover.github.io/terra-broncohacks/preview/`

What's different in the preview:
- New centralized colour palette (8 CSS tokens, swap-friendly).
- Bordered icon-tile system replacing decorative emoji throughout.
- No pure-white backgrounds — everything uses the warm-cream palette.
- **Preview-only:** Google sign-in is bypassed for faster testing. A stub
  `eco_user` is planted on first load so you can move straight through the
  intro flow into the home screen without OAuth. Remove `PREVIEW_SKIP_AUTH`
  in `preview/javascript/signin.js` to restore real auth here.

When the design is approved, the contents of `preview/` will be promoted
to the repo root, replacing the production build.

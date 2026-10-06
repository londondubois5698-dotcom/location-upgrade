# Titan Max — Work Mode Handoff

## Current objective
Titan Max is London's standalone iPhone field AI. The target experience is an elite corporate AI executive: premium glass/human visual design, natural realtime voice, persistent field memory, fast startup, and clear NOW → NEW sales visualization.

## Current live architecture
- Frontend source: `titan-max/`
- Compiled GitHub Pages output: `titan-live/`
- Public app: `https://londondubois5698-dotcom.github.io/location-upgrade/titan-live/`
- Secure backend: Sterling Vercel project, `sterling-olive.vercel.app`
- Realtime model: `openai/gpt-realtime-2.1`
- Reuses Sterling's server-side Vercel AI Gateway credential.
- Never put the long-lived AI Gateway key in GitHub or browser code.
- Browser stores only Titan's private app passcode.

## What was just changed
1. Rebuilt the avatar around a rounded human glass face with executive suit silhouette, organic face shape, ears, nose, lips, tracked eyes, glass highlights, and restrained HUD effects.
2. Shifted personality from playful robot toward calm, polished, boardroom-level executive AI.
3. Added authenticated startup health endpoint: `/api/titan-max-health`.
4. Startup now runs health preflight before requesting the microphone.
5. Invalid passcode clears local pairing and reopens setup.
6. Backend timeout and realtime timeout now fail cleanly instead of hanging forever.
7. UI remains resolution-independent SVG so it should render sharply on Retina/4K displays.

## Important files
- `titan-max/src/main.jsx` — UI, realtime session, avatar, startup logic.
- `titan-max/src/styles.css` — executive glass design and responsive layout.
- `sterling/api/titan-max-token.js` — short-lived realtime token.
- `sterling/api/titan-max-health.js` — preflight health/auth.
- `sterling/api/titan-max-memory.js` — persistent stop memory.
- `sterling/api/titan-max-learn.js` — reusable session learning.
- `.github/workflows/titan-max-pages.yml` — compiles and publishes `titan-live/`.

## Non-negotiable product rules
- Do not expose permanent AI/API secrets in frontend code.
- Do not store SSNs, payment-card data, account PINs, passwords, one-time codes, or driver's-license numbers.
- iPhone Safari/PWA microphone requires a user gesture; do not attempt to bypass it.
- A failed startup must terminate with a useful message, never an endless loader.
- Titan may accumulate memory/lessons, but do not claim the underlying model retrains itself.

## Next Work Mode priorities
- Test the full GitHub Pages → Vercel health → realtime voice path on iPhone.
- Inspect live errors if the user reports a specific startup message.
- Continue visual refinement toward premium human glass executive, not cartoon robot.
- Add native-like transition states only after voice startup is verified.
- Consider a dedicated Titan backend/project only if isolation provides a concrete reliability benefit; do not duplicate infrastructure just for branding.

## Continuity instruction
When this project is opened in ChatGPT Work, read this file first, then inspect the latest commits and current live deployment before modifying anything.

## Latest realtime reliability fix
- Fixed the concrete `Realtime session is not accepting submissions` bug seen on iPhone.
- Root cause: AI SDK `connect()` can return before the provider has emitted its writable-ready session event.
- Titan no longer sends its greeting immediately after `connect()`.
- The first spoken turn is now queued until `session-created`, `session-updated`, or `session-started` arrives, then it is submitted.
- Transport promise rejections are caught and converted into a clean retry state instead of an unhandled failure.

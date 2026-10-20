# STERLING WOLF PACK

Working application rebuild for London's existing Sterling Vercel project. This is a review preview. Production has not been promoted.

## Run and deploy

Use Node.js 22 or newer. Run `npm install`, `npm test`, then `npm run build` from this directory. Serve `dist` through HTTP for layout/media work. Voice requires HTTPS and the `/api/wolf-token` server function, so a plain file or static-only ZIP opener is insufficient. Vercel root directory is `sterling` in the repository, build command `npm run build`, output directory `dist`.

The project has no new provider credential. The new same-origin adapter obtains an ephemeral realtime setup from the existing `https://sterling-olive.vercel.app/api/realtime-token` service. Original server endpoints, credential-store code, dependencies and Titan files are retained. API credentials remain in the existing server-owned Vercel store. On another hosting account, the voice adapter must be configured for an authorized backend. No private key belongs in client code or this ZIP.

## Implemented

- Supplied silver-and-blue Sterling portrait and actual uploaded cinematic MP4; native 512 × 910, 30 fps, 8 seconds. Optimized H.264 file is 1,597,355 bytes, no audio, fast start. It is not 4K.
- Muted inline autoplay, persistent portrait underneath, media readiness checks, stalled/failed playback fallback, explicit retry and motion pause, reduced-motion handling, background pause.
- Persistent video element across navigation. Selection reactions change restrained edge lighting without seeking or restarting the clip. Conversation states take priority over idle events.
- Randomized 120-second controller schedules gentle playback-rate variation (around 0.5×) and occasional interface lighting. Every cycle gets a new schedule. The source clip itself repeats about every 16 seconds at half speed.
- Ten steps: introduction/contact; current phones/carrier/lines/bill; priorities; comparison; device-family choice/exact model; configuration/plan preference; home services; review; appointment request. Customer choices are kept in sessionStorage on this device until reset.
- Quote comparison only uses manually entered estimates. No fabricated prices or eligibility. Device cards are design illustrations of product families, not a verified product catalog or exact device renders.
- Real AI Gateway WebSocket voice, PCM audio playback and microphone worklet, conversational context, server tools that update contact/discovery, device selections, preferences and navigation. Speak asks about the visible step. Listen requests/toggles actual microphone capture. End closes audio, tracks and socket. Reset clears details and ends voice.
- No microphone: live audio output can still work; the interface clearly reports that listening is unavailable. Denied access is not presented as successful listening. Voice pauses the microphone in the background. Capture is paused during assistant output to reduce outdoor echo; this is not full-duplex barge-in.
- Three-hour appointment windows and a reviewable SMS request to 205-310-8645. The customer must tap Send in the messaging app. No automatic message or appointment confirmation is claimed.

## Honest limits / remaining release gates

This is not the complete cinematic character pipeline requested in the master brief. No additional character clips or 3D facial rig were available. Blinking, eye direction, head gestures, expressions, walking and lip-sync are not independently controlled. Speaking/listening/presenting states currently drive interface lighting and audio behavior; they do not alter Sterling's actual facial performance. The supplied clip includes its own moving energy effects and an observable repeated scene. It cannot become a seamless, nonrepeating two-minute performance simply through JavaScript.

A production-quality character update needs identity-consistent high-resolution idle/listening/speaking/presentation clips or a licensed rig with facial controls and visemes, plus a validated media-generation/rendering pipeline. Those assets have not been generated here. No upscaled asset is represented as native 4K.

Actual iPhone Safari microphone, speaker, autoplay, low-power mode, safe-area behavior and native SMS handoff still require a physical device check. Automated verification used desktop Chrome and a real 390 × 844 CSS-pixel iframe viewport, not Safari. No customer eligibility check, CRM/order submission, live inventory or promotion verification has been connected to the new UI. Existing unrelated integration endpoints remain unchanged and are not claimed as retested integrations.

## Canonical production path

Development branch: `sterling-wolf-pack-20261016` in `londondubois5698-dotcom/location-upgrade`. Changes are restricted to the Sterling app. Titan and unrelated projects are not modified.

After the remaining device/animation gates and London's approval, merge the reviewed branch into main and deploy it to the existing Sterling Vercel project `prj_qF1JIA89Qew8p9JlSQTlmCjZPfx9`, retaining all existing server files, environment settings and credential storage. Promote the verified deployment to the current `sterling-olive.vercel.app` domain. Do not create a second production project or promote an earlier standalone preview that omits the retained backend. Recheck `/api/realtime-token`, `/api/wolf-token` and the actual MP4 URL after promotion. Keep the prior production deployment available for rollback.

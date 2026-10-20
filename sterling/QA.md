# Verification record

Application: STERLING WOLF PACK
Review date: October 20, 2026
Runtime commit: 9ad22a182a845142e21aa19c28882b0481c8e222
Preview deployment: dpl_2SECPqGeVzKWjwQKdCPuE3Z3emnV
Preview: https://sterling-111xa8ntp-londondubois5698-dotcom.vercel.app/
Draft review: https://github.com/londondubois5698-dotcom/location-upgrade/pull/11

## Confirmed

- Vercel preview build READY; production target not selected. Main remains at 6a68013578027b9ee3a94347fcf154cc4ef8f51b.
- Local build succeeds and eight regression checks pass, covering animation priority, media fallback, two-minute timer renewal, conversation context, origin/method validation, backend unavailability, overlapping AI tool replies and ending voice while microphone permission is pending.
- Actual supplied MP4 plays in the deployed page. Browser reports native 512 × 910, readyState 4, advancing currentTime and playback rate around 0.5. Multiple page-section selections preserve the same video element.
- In the live mobile page, the controller advanced from cycle 1 to cycle 2 while Sterling remained visible and the video kept playing. Cycle 1 scheduled events at 13409, 37111, 57724, 81923, 98179 ms; cycle 2 used 14587, 31135, 51488, 71269, 86302, 108456 ms. This confirms renewal and variety in controller timing, not new facial performances.
- MP4 request returns HTTP 200, video/mp4, Content-Length 1597355 and Accept-Ranges: bytes. A range request returns HTTP 206 with bytes 0-1023/1597355. Poster and audio worklet return HTTP 200 with correct content types.
- Desktop browser view and actual 390 × 844 CSS-pixel iframe layout were opened and interacted with. Mobile body width and scrollWidth both equal 390; body height equals 844. This verifies responsive layout in Chrome, not iOS Safari.
- Ten-step customer flow was exercised: contact; carrier/model/lines/bill; priorities; now/new estimate; phone family; color/storage/plan preference; internet/TV; summary; appointment. Test data persisted into the review and copied SMS summary. The appointment uses a three-hour window and identifies the request as awaiting London's confirmation. No message was sent.
- Reset confirmation clears the customer fields and ends voice. Immersive character view has a working return control. Pause/resume controls affect the actual video.
- A deliberately missing video asset was tested. Sterling's portrait remained visible, with a retry action and no claim that animation was active. Expected 404 appears only on the deliberate failure fixture.
- The actual voice connection opens through /api/wolf-token and the existing realtime service. Speak starts a real AI response. End restores controls. The browser has no input device; the UI accurately reports that listening is unavailable while retaining spoken output.
- Live synthetic spoken-audio round trip: speech-started, speech-stopped and audio-committed events arrived; saveDiscovery returned carrier Verizon and lines 4; the service produced 307200 bytes of response PCM audio. This verifies the audio protocol and tool flow; it does not verify a physical microphone.
- No application-origin JavaScript console errors were observed in normal playback/flow checks. The test browser reports unrelated chrome-extension metadata errors.

## Not complete / not claimed

- Physical iPhone Safari microphone, speakers, autoplay under low-power mode, keyboard/safe-area behavior and native SMS composer handoff.
- Independent eyelid/eye/head/face animation, walking, facial rigging, phoneme/viseme lip-sync or a nonrepeating two-minute character performance. Current conversation states control audio and interface effects around the existing video.
- Native 4K assets. The provided eight-second clip is 512 × 910. It repeats about every sixteen seconds at half speed.
- Exact product catalog images, verified current device specifications, inventory, promotion eligibility, live quote/order/CRM integration. Product-family illustrations and manual estimates are clearly identified.
- Original unrelated endpoints are retained, but this is not a claim that every legacy integration was retested.

The preview is reviewable and usable for the implemented flow. It has not met every cinematic and physical-device release gate in the master brief. Do not call the full reconstruction complete or promote automatically.

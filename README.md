# &lt;usermedia&gt; HTML Element Demo

This [&lt;usermedia&gt; HTML element demo](https://addpipe.com/tech-demos/usermedia-html-element-demo/) exercises the new capability element that [shipped in Chrome 151](https://developer.chrome.com/blog/usermedia-html-element). You put the tag on the page, the browser draws the button, the user clicks it, and your page gets a `MediaStream` — with no `getUserMedia()` call of your own.

It covers the full shipped surface of `HTMLUserMediaElement`, plus the sibling `<camera>` and `<microphone>` elements:

- `stream`, `error` and `cancel` events (and their `onstream` / `onerror` / `oncancel` handlers)
- `stream` and `error` properties
- `setConstraints()` and the constraint filter Chrome runs it through
- Declarative constraints via a nested `<script type="permissionconstraints">`
- The `:granted` pseudo-class and the enforced CSS rulebook
- The browser-supplied, `lang`-driven button label
- `<camera>` and `<microphone>` with their flat `MediaTrackConstraintSet` and `track` event
- Legacy `type` mode: `isValid`, `invalidReason`, `permissionStatus`, `isTypeSupported()`, `promptaction`, `promptdismiss`, `validationstatuschange`
- Permissions policy and cross-origin rules in iframes
- A `getUserMedia()` fallback for browsers that don't know the tag

## How to use
1. Serve the folder over HTTPS or `localhost` — the element needs a secure context, and the iframe demos won't load over `file://`. Anything works: `python3 -m http.server`, `npx serve`, etc.
2. Open it in Chrome 151 or later. Chrome 153+ for the `<camera>` and `<microphone>` sections.
3. Click the browser-drawn button in section 1 and allow camera and microphone.
4. Before clicking, try the constraints lab in section 2 — it shows which of your constraints Chrome keeps and which it silently discards.
5. Break the element on purpose in the styling playground in section 4 and watch Chrome disable it.
6. Watch the event & error log at the bottom the whole time.

## Main features
- Live `stream` / `error` / `cancel` handling with a video preview, input level meter and per-track table (settings, capabilities, constraints, `readyState`, `enabled`, `muted`)
- A **constraint sanitizer** that mirrors Chromium's own `SanitizeTrackConstraints()` — paste any constraint dictionary and see each key marked kept or dropped, with the reason
- A **styling playground** with a live CSS editor, nine one-click violation presets, an author-value vs. computed-value table, and a validity predictor running Chrome's real thresholds (3:1 contrast, opaque colors, `small`–`xxx-large` font size, allowed `display` values, occlusion)
- Trusted-activation probes: `element.click()`, `element.focus()` and a synthetic `MouseEvent`, so you can see what an untrusted activation does
- Two iframes side by side, one with `allow="camera; microphone"` and one with `allow="camera 'none'; microphone 'none'"`, both reporting back into the main log
- A code generator that emits working markup, CSS and JS for whatever constraints and styling you configured
- Environment & support panel: element and interface detection, secure context, permissions policy, live Permissions API state, Chrome version
- Progressive enhancement throughout — every element carries a nested `<button>` wired to `getUserMedia()`, so the page still works in Firefox and Safari

## Event & error log
The page logs every `stream`, `error` and `cancel` event from every element on the page, every `MediaStreamTrack` state change (`mute`, `unmute`, `ended`), every Permissions API change, every style validation result, every message posted back from the iframes, and every uncaught page error — each with the elapsed time since page load. The log can be filtered by level and copied to the clipboard, which makes it useful when reporting a browser bug. Chrome's own complaints about your CSS go to the DevTools **Issues** panel rather than here.

## Works on
- Chrome 151+ on Windows, macOS, Linux, ChromeOS and Android — `<usermedia>`
- Chrome 153+ — `<camera>` and `<microphone>`. Earlier builds can enable them with the `CameraAndMicrophoneElements` flag under `chrome://flags/#enable-experimental-web-platform-features`
- Secure contexts only: HTTPS, or `localhost` / `127.0.0.1`
- Everywhere else the tag is an `HTMLUnknownElement`, the nested `<button>` renders, and the demo falls back to `getUserMedia()`

## Known issues
- No video-only or audio-only stream from `<usermedia>`. The constraint filter always emits both an audio and a video entry, so `audio: false` is discarded and the camera light comes on even if you only wanted a microphone. Use `<camera>` or `<microphone>` instead
- **`setConstraints()` is one-shot.** Chromium returns early on every call after the first — no warning, no exception, no console message. Chrome's announcement post describes it as a way to "update" preferences, which it isn't
- **Wrapped constraints are dropped silently.** Only bare values survive: `{ width: 1280 }` is kept, `{ width: { ideal: 1280 } }` is discarded key and all, as are `exact`, `min`, `max` and `advanced`. This is deliberate — it stops the element ever failing with an `OverconstrainedError` — but it makes reliable device selection and resolution pinning hard. Only 16 properties are on the allowlist at all; section 2 of the demo lists them
- In a cross-origin iframe the element is invalid unless the framed document *also* serves a Content-Security-Policy containing `frame-ancestors` — a requirement `getUserMedia()` does not have, and one that quietly breaks embedded widgets
- When the element is invalid — blocked by permissions policy, occluded, clipped, badly styled, or freshly attached — clicks produce nothing at all. No event, no exception, so there is no way for your code to notice. Standard mode has no `isValid`; that only exists in the deprecated `type` legacy mode
- No `autostart` attribute in the shipped element. It is described in the explainer but is not in Chrome 151, so there is no way to resume a previously granted stream without a click
- No declarative way to connect the element to a `<video>`. You still need JavaScript to set `srcObject`
- A stream starts live. There is no way to acquire it with tracks disabled, so the hardware indicator lights up the moment permission is granted
- The element is not focusable from script and is skipped by `autofocus` without user activation, so keyboard-first flows need care
- `<script type="permissionconstraints">` for declarative constraints is not documented by Chrome. The demo probes it at runtime and reports whether it actually did anything in your browser
- Not available in Android WebView, which rules out a large slice of in-app browsers
- Chrome-only for now. Firefox has the proposal [under consideration](https://github.com/mozilla/standards-positions/issues/1392) and WebKit has not given a position

## Resources & Links
- [Introducing the &lt;usermedia&gt; HTML element](https://developer.chrome.com/blog/usermedia-html-element) — Chrome for Developers
- [Media Capture Elements explainer](https://github.com/w3c/mediacapture-extensions/blob/main/media-capture-elements-explainer.md) — `<camera>`, `<microphone>`, `<usermedia>`
- [Specification](https://w3c.github.io/mediacapture-extensions/#the-usermedia-html-element) — Media Capture and Streams Extensions
- [&lt;usermedia&gt; on Chrome Platform Status](https://chromestatus.com/feature/5125006551416832)
- [Web Platform Tests for the element](https://wpt.fyi/results/html/semantics/permission-element/usermedia)
- [Introducing the &lt;geolocation&gt; HTML element](https://developer.chrome.com/blog/geolocation-html-element) — the first capability element
- [The original &lt;permission&gt; element origin trial](https://developer.chrome.com/blog/permission-element-origin-trial) (PEPC) — where the CSS rulebook comes from
- [Getting Started With getUserMedia](https://blog.addpipe.com/getusermedia-getting-started/)

# Privacy threat model — mesh-metronome

## What other peers in the same room can see

- `Date.now()` timestamps (clock sync).
- Yjs awareness `clientID` — per-session random integer.

That's it. Each phone schedules its own clicks locally, and the audio is produced locally; nothing about your click stream is sent on the wire.

## What stays local

- Your pattern choice.
- Your BPM (must match other phones to lock, but it's not shared automatically — you set it yourself).
- All audio synthesis.

## What the signaling server sees

The room name and encrypted SDP offers/answers. No click events, no audio.

## What the TURN server sees

Encrypted DTLS/SRTP bytes if peers can't connect directly. Cannot decrypt.

## What the shared app chrome sends (not covered by the sections above)

This app is built on `@baditaflorin/mesh-common`'s `<MeshShell>`, which makes two
network calls of its own on every page load, independent of the mesh/WebRTC
features above. Verified against the built bundle
(`docs/assets/index-*.js`) and by tracing live requests from a running
session — neither call was previously listed in this document even though
both fire by default:

- **Pageview beacon** — a 1×1 GIF request to `https://pixel.0exec.com/pix.gif`
  fires once per room on mount, carrying the app name, room id, the first 6
  chars of your peer id, and the referrer. It fires automatically — you don't
  need to press "Connect to mesh" first. Honors Do-Not-Track and has a
  per-device opt-out toggle in ⚙ Settings ("Opt out of anonymous pageview
  pings").
- **Fleet identity panel** — ⚙ Settings also renders a cross-app nickname/avatar
  panel (`FleetIdentityPanel`) wired to `https://fleet-persona.0exec.com` by
  default. Nothing is sent there unless you explicitly switch its "Sync" mode
  to "Cross-domain" — but the panel and its default remote endpoint are present
  out of the box, this app does not pass `fleetIdentityServiceUrl={null}` to
  opt out of showing it.

Both are fleet-wide `mesh-common` infrastructure, not app-specific backend —
consistent with the "no backend" claim in the README, which refers to this
app having no server-side logic of its own. But they are real network calls
that leave the device, so a privacy _threat model_ for this app should name
them rather than omit them.

## Capabilities used by this app

<!-- mesh:capabilities-block:start -->

- 📳 **Vibration** — output only (no data leaves the device).
<!-- mesh:capabilities-block:end -->

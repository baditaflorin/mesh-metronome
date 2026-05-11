# mesh-metronome

[![Live](https://img.shields.io/badge/live-baditaflorin.github.io%2Fmesh--metronome-FF5E7A?style=flat-square)](https://baditaflorin.github.io/mesh-metronome/)
[![Version](https://img.shields.io/github/package-json/v/baditaflorin/mesh-metronome?style=flat-square&color=6e6e8a)](https://github.com/baditaflorin/mesh-metronome/blob/main/package.json)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![No backend](https://img.shields.io/badge/backend-none-1a160a?style=flat-square)](docs/adr/0001-deployment-mode.md)

> Peer-to-peer mesh: 4 phones become a polyrhythm grid, each playing a clock-synced subdivision of the same BPM.

**Live:** https://baditaflorin.github.io/mesh-metronome/

Hand four phones to four people. Each phone plays a different subdivision — quarters, eighths, triplets, dotted-eighths, five-against-four. All driven by the same mesh clock, so the polyrhythm actually fits together instead of drifting apart.

You quickly notice how much harder polyrhythms are when you can hear all five voices at once.

## How it works

1. Yjs over y-webrtc connects the phones.
2. Median-offset clock sync gives every phone the same mesh time (~10–30 ms).
3. Each phone independently schedules its own clicks: `tick_n = n × (barMs / subdivisionsPerBar)`, mapped from mesh-time to local `AudioContext.currentTime` once per tick.
4. Web Audio's `osc.start(t)` then nails the click to that mesh-time boundary with sample-accurate timing.

Audible synchrony lands around **±15 ms** in steady state — well below the threshold where polyrhythm "fits."

## Patterns

| Pattern                 | Subdivisions per bar (at 4/4) | Use               |
| ----------------------- | ----------------------------- | ----------------- |
| quarter (♩)             | 4                             | the pulse         |
| eighth (♫)              | 8                             | offbeat           |
| triplet (3:2)           | 6                             | three against two |
| dotted eighth (3:8)     | 16/3                          | clave             |
| five-against-four (5:4) | 5                             | jazz brain teaser |

Every phone picks its own pattern in Settings. BPM is set per-phone too, but **must match** across phones for the polyrhythm to lock.

## Privacy threat model

See [docs/privacy.md](docs/privacy.md). On the wire: `{ t }` timestamps for clock sync. Each phone schedules its own audio locally. Nothing about your audio leaves the device.

## Architecture

- **Mode A** — pure GitHub Pages.
- **WebRTC** — Yjs + y-webrtc with self-hosted signaling and TURN.
- **No GitHub Actions.** Local pre-push hook gates everything.

## Run it locally

```bash
git clone https://github.com/baditaflorin/mesh-metronome.git
cd mesh-metronome
npm install
npm run dev
```

## Self-hosted infrastructure

| Repo                                                                   | Endpoint                               | Role                      |
| ---------------------------------------------------------------------- | -------------------------------------- | ------------------------- |
| [signaling-server](https://github.com/baditaflorin/signaling-server)   | `wss://turn.0docker.com/ws`            | y-webrtc protocol fan-out |
| [turn-token-server](https://github.com/baditaflorin/turn-token-server) | `https://turn.0docker.com/credentials` | HMAC TURN creds           |
| [coturn-hetzner](https://github.com/baditaflorin/coturn-hetzner)       | `turn:turn.0docker.com:3479`           | TURN relay                |

## ADRs

- [0001 — Deployment mode](docs/adr/0001-deployment-mode.md)
- [0002 — Audio scheduling under mesh clock](docs/adr/0002-audio-scheduling.md)
- [0003 — Pattern set](docs/adr/0003-pattern-set.md)
- [0010 — GitHub Pages publishing](docs/adr/0010-pages-publishing.md)

## License

[MIT](LICENSE) © 2026 Florin Badita

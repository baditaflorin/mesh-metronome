---
status: accepted
date: 2026-05-11
---

# 0002 — Audio scheduling under mesh clock

## Context

A polyrhythm sounds wrong if any phone's click drifts more than ~20 ms from where the others expect it. The browser gives us two clocks:

- `Date.now()` — wall-clock, drifts between devices, what mesh clock sync uses.
- `AudioContext.currentTime` — monotonic, sub-millisecond precision **within one device**, but unrelated to wall-clock or other devices.

We need to translate from mesh-time-of-the-next-tick to local-AudioContext-time so the call to `oscillator.start(t)` lands the click sample-accurately on the right wall-clock instant.

## Decision

Per-frame inside the rAF loop:

1. `t_mesh = clock.meshNow()` (wall-clock mesh time, ms).
2. `tick_idx = floor(t_mesh / subMs)` — the index of the most recent subdivision boundary.
3. If `tick_idx` differs from `last_tick_idx`, we have a new click to schedule.
4. Compute `t_target_mesh = tick_idx * subMs` (the wall-clock-mesh-time of the boundary we just crossed).
5. Compute `ahead_s = (t_target_mesh - t_mesh) / 1000` — usually negative or near zero (we just crossed). Clamp to ≥ 0.
6. Schedule the click at `ctx.currentTime + ahead_s`.

Because `ctx.currentTime` and `Date.now()` advance at the same rate (give or take a few ppm of clock skew, negligible inside a 50 ms window), this scheduling is sample-accurate inside the local audio scheduler from now until ~5 s out. We don't pre-schedule further than that because mesh-clock corrections might shift the target.

## Consequences

- Sub-AudioContext-tick accuracy on the local device.
- Cross-device synchrony is exactly as tight as the mesh-clock-sync allows (~10–30 ms steady state).
- We re-compute every animation frame, which is wasteful but ~60 Hz of arithmetic is nothing on modern phones.

## Alternatives considered

- **Use a Web Worker scheduler with `setTimeout`** (the classic "lookahead scheduler" pattern). Rejected — we already have rAF + AudioContext.currentTime; the lookahead is small and the rAF jitter is already < 16 ms.
- **Designate a leader phone that publishes "tick now" events.** Rejected — those events have signaling-RTT slop, defeating the point. Local scheduling against shared mesh-time-future is tighter.

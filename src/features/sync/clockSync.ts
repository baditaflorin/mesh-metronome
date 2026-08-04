/**
 * Mesh clock sync — each peer publishes its local time via Yjs awareness; we
 * compute a running offset to mesh-median time. Not NTP-grade, but stable to
 * ~10–30 ms once a few rounds have settled.
 *
 * Algorithm:
 *   1. Every PING_INTERVAL ms, each peer publishes { t: Date.now() } into its
 *      awareness state.
 *   2. On receipt of a remote peer's awareness update, we compute
 *      offset_peer = peer.t - my.t (a single sample, no RTT correction).
 *   3. Mesh time = my Date.now() + median(offset_peer for live peers).
 *
 * The median is robust to slow phones / GC pauses. Without RTT correction the
 * absolute offset has a one-way-latency bias, but every peer applies the same
 * bias, so visible synchrony across phones is preserved.
 */

import type { WebrtcProvider } from "y-webrtc";

const PING_INTERVAL_MS = 1500;
const SAMPLE_TTL_MS = 5000;

// Awareness state is attacker-controllable: any peer who knows (or guesses —
// the default room is literally "default") the room id can join and publish
// arbitrary JSON via Yjs awareness, no auth required. A single malformed or
// adversarial `clock.t` (NaN/Infinity/a bogus huge value) must not be able to
// poison meshNow() for everyone else in the room — that previously produced a
// silent, permanent NaN mesh-clock (dead audio, blank progress bar, no error)
// for every other peer for as long as the bad sample kept refreshing.
// No real device's wall clock should ever be a full day off from ours.
const MAX_PLAUSIBLE_OFFSET_MS = 24 * 60 * 60 * 1000;
const MIN_PLAUSIBLE_BPM = 1;
const MAX_PLAUSIBLE_BPM = 1000;

type Sample = { offset: number; receivedAt: number; bpm?: number };

export type ClockSync = {
  meshNow: () => number;
  destroy: () => void;
  peerCount: () => number;
  /** Publish this phone's BPM so peers can detect a mismatch. */
  setBpm: (bpm: number) => void;
  /** Distinct BPM values currently advertised by live remote peers. */
  peerBpms: () => number[];
};

type Awareness = {
  clientID: number;
  setLocalStateField: (key: string, value: unknown) => void;
  getStates: () => Map<number, Record<string, unknown>>;
  on: (event: string, cb: () => void) => void;
  off: (event: string, cb: () => void) => void;
};

export function createClockSync(provider: WebrtcProvider | null): ClockSync {
  if (!provider) {
    return {
      meshNow: () => Date.now(),
      destroy: () => undefined,
      peerCount: () => 0,
      setBpm: () => undefined,
      peerBpms: () => [],
    };
  }

  const awareness = (provider as unknown as { awareness: Awareness }).awareness;
  const samples = new Map<number, Sample>();
  let localBpm: number | undefined;

  const publish = () => {
    awareness.setLocalStateField("clock", { t: Date.now(), bpm: localBpm });
  };

  const onChange = () => {
    const now = Date.now();
    const states = awareness.getStates();
    samples.forEach((_, id) => {
      if (!states.has(id)) samples.delete(id);
    });
    states.forEach((state, id) => {
      if (id === awareness.clientID) return;
      const clock = state["clock"] as { t?: number; bpm?: number } | undefined;
      // `typeof x === "number"` alone does NOT reject NaN/Infinity — both are
      // type "number" in JS — so validate finiteness (and plausibility)
      // explicitly before trusting anything a remote peer published.
      if (typeof clock?.t !== "number" || !Number.isFinite(clock.t)) return;
      const offset = clock.t - now;
      if (Math.abs(offset) > MAX_PLAUSIBLE_OFFSET_MS) return;
      const bpm =
        typeof clock.bpm === "number" &&
        Number.isFinite(clock.bpm) &&
        clock.bpm >= MIN_PLAUSIBLE_BPM &&
        clock.bpm <= MAX_PLAUSIBLE_BPM
          ? clock.bpm
          : undefined;
      samples.set(id, { offset, receivedAt: now, bpm });
    });
  };

  publish();
  onChange();

  const pingTimer = setInterval(publish, PING_INTERVAL_MS);
  awareness.on("change", onChange);

  const meshNow = () => {
    const cutoff = Date.now() - SAMPLE_TTL_MS;
    const offsets: number[] = [];
    samples.forEach((s) => {
      if (s.receivedAt >= cutoff) offsets.push(s.offset);
    });
    if (offsets.length === 0) return Date.now();
    offsets.sort((a, b) => a - b);
    const mid = Math.floor(offsets.length / 2);
    const median =
      offsets.length % 2 === 1
        ? (offsets[mid] ?? 0)
        : ((offsets[mid - 1] ?? 0) + (offsets[mid] ?? 0)) / 2;
    return Date.now() + median;
  };

  const destroy = () => {
    clearInterval(pingTimer);
    awareness.off("change", onChange);
  };

  const peerCount = () => samples.size;

  const setBpm = (bpm: number) => {
    localBpm = bpm;
    publish();
  };

  const peerBpms = () => {
    const cutoff = Date.now() - SAMPLE_TTL_MS;
    const seen = new Set<number>();
    samples.forEach((s) => {
      if (s.receivedAt >= cutoff && typeof s.bpm === "number") seen.add(s.bpm);
    });
    return [...seen];
  };

  return { meshNow, destroy, peerCount, setBpm, peerBpms };
}

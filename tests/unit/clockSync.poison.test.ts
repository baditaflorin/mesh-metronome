import { describe, expect, it } from "vitest";
import { createClockSync } from "../../src/features/sync/clockSync";
import type { WebrtcProvider } from "y-webrtc";

/**
 * Minimal fake of the y-webrtc `awareness` surface that createClockSync
 * actually touches, so we can drive it with attacker-controlled state
 * without spinning up real WebRTC/signaling.
 */
function makeFakeProvider(initialStates: Map<number, Record<string, unknown>>) {
  const listeners = new Set<() => void>();
  let states = initialStates;
  const awareness = {
    clientID: 0, // "us"
    setLocalStateField: () => undefined,
    getStates: () => states,
    on: (_event: string, cb: () => void) => listeners.add(cb),
    off: (_event: string, cb: () => void) => listeners.delete(cb),
  };
  return {
    provider: { awareness } as unknown as WebrtcProvider,
    setStates: (next: Map<number, Record<string, unknown>>) => {
      states = next;
      listeners.forEach((cb) => cb());
    },
  };
}

describe("createClockSync — adversarial/malformed peer awareness data", () => {
  it("ignores a peer publishing a non-finite clock.t (NaN) instead of poisoning meshNow()", () => {
    const { provider, setStates } = makeFakeProvider(new Map());
    const clock = createClockSync(provider);

    // A single remote peer (id 1) publishes a malformed/adversarial clock —
    // e.g. NaN, which `typeof` alone does not filter out (typeof NaN === "number").
    setStates(new Map([[1, { clock: { t: Number.NaN, bpm: 120 } }]]));

    const now = clock.meshNow();
    expect(Number.isFinite(now)).toBe(true);
    clock.destroy();
  });

  it("ignores a peer publishing an Infinite clock.t", () => {
    const { provider, setStates } = makeFakeProvider(new Map());
    const clock = createClockSync(provider);

    setStates(new Map([[1, { clock: { t: Number.POSITIVE_INFINITY, bpm: 120 } }]]));

    const now = clock.meshNow();
    expect(Number.isFinite(now)).toBe(true);
    clock.destroy();
  });

  it("a single NaN-publishing peer does not corrupt the median for the other, honest peers", () => {
    const { provider, setStates } = makeFakeProvider(new Map());
    const clock = createClockSync(provider);
    const realNow = Date.now();

    setStates(
      new Map([
        [1, { clock: { t: realNow + 20, bpm: 120 } }], // honest peer, +20ms
        [2, { clock: { t: realNow + 30, bpm: 120 } }], // honest peer, +30ms
        [3, { clock: { t: Number.NaN, bpm: 120 } }], // adversarial/corrupt peer
      ]),
    );

    const now = clock.meshNow();
    expect(Number.isFinite(now)).toBe(true);
    // Should track the honest peers' median offset (~+25ms), not be blown up by NaN.
    expect(Math.abs(now - (realNow + 25))).toBeLessThan(50);
    clock.destroy();
  });

  it("does not let a peer advertise a non-finite BPM into peerBpms()", () => {
    const { provider, setStates } = makeFakeProvider(new Map());
    const clock = createClockSync(provider);

    setStates(new Map([[1, { clock: { t: Date.now(), bpm: Number.NaN } }]]));

    for (const b of clock.peerBpms()) {
      expect(Number.isFinite(b)).toBe(true);
    }
    clock.destroy();
  });
});

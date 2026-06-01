import { useEffect, useMemo, useRef, useState } from "react";
import { useTone, useVibration } from "@baditaflorin/mesh-common";
import { createRoomSync } from "../sync/yjsRoom";
import { createClockSync } from "../sync/clockSync";
import { maybeFetchTurnCredentials } from "../sync/iceConfig";

export type PatternId = "quarter" | "eighth" | "triplet" | "dotted-eighth" | "fives";

const PATTERN: Record<
  PatternId,
  { label: string; subdivisionsPerBar: number; freq: number; color: string }
> = {
  quarter: { label: "quarter (♩)", subdivisionsPerBar: 4, freq: 440, color: "#ff5e7a" },
  eighth: { label: "eighth (♫)", subdivisionsPerBar: 8, freq: 660, color: "#5ed3ff" },
  triplet: { label: "triplet (3:2)", subdivisionsPerBar: 6, freq: 550, color: "#5eff8a" },
  "dotted-eighth": {
    label: "dotted eighth (3:8)",
    subdivisionsPerBar: 16 / 3,
    freq: 770,
    color: "#ffcf5e",
  },
  fives: { label: "five-against-four (5:4)", subdivisionsPerBar: 5, freq: 880, color: "#c45eff" },
};

const BAR_MS_AT_120 = 2000; // 1 bar = 2 s at 120 BPM (4 beats × 500 ms)

type Props = {
  roomId: string;
  pattern: PatternId;
  bpm: number;
  haptic: boolean;
};

export function Metronome({ roomId, pattern, bpm, haptic }: Props) {
  const [armed, setArmed] = useState(false);
  const [running, setRunning] = useState(false);
  const [peers, setPeers] = useState(0);
  const [phase, setPhase] = useState(0);
  const [mismatchedBpms, setMismatchedBpms] = useState<number[]>([]);
  const lastTickRef = useRef(-1);
  const tone = useTone();
  const vib = useVibration();

  const mesh = useMemo(() => {
    if (!armed) return null;
    const room = createRoomSync(roomId);
    const clock = createClockSync(room.provider);
    return { room, clock };
  }, [armed, roomId]);

  useEffect(() => {
    if (!armed) return;
    void maybeFetchTurnCredentials();
  }, [armed]);

  useEffect(() => {
    return () => {
      mesh?.clock.destroy();
      mesh?.room.provider?.destroy();
    };
  }, [mesh]);

  // Publish this phone's BPM so peers can flag a mismatch (the polyrhythm only
  // locks when every phone runs the same BPM — see README).
  useEffect(() => {
    mesh?.clock.setBpm(bpm);
  }, [mesh, bpm]);

  useEffect(() => {
    if (!mesh) return undefined;
    const i = setInterval(() => {
      setPeers(mesh.clock.peerCount());
      // Peers advertising a BPM other than ours: the polyrhythm won't fit.
      setMismatchedBpms(mesh.clock.peerBpms().filter((b) => b !== bpm));
    }, 500);
    return () => clearInterval(i);
  }, [mesh, bpm]);

  useEffect(() => {
    if (!mesh || !running) return undefined;

    const barMs = BAR_MS_AT_120 * (120 / bpm);
    const subMs = barMs / PATTERN[pattern].subdivisionsPerBar;

    let frame = 0;
    const tick = () => {
      const t = mesh.clock.meshNow();
      const inBar = ((t % barMs) + barMs) % barMs;
      setPhase(inBar / barMs);

      const subIdx = Math.floor(t / subMs);
      if (subIdx !== lastTickRef.current) {
        lastTickRef.current = subIdx;
        // Schedule the click for the START of this subdivision.
        const tickT = subIdx * subMs;
        const ahead = (tickT - t) / 1000; // negative if just passed
        tone.play({
          freq: PATTERN[pattern].freq,
          type: "square",
          duration: 0.05,
          gain: 0.18,
          attack: 0.001,
          at: Math.max(0, ahead),
        });
        if (haptic) vib.vibrate(15);
      }

      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [mesh, running, bpm, pattern, haptic]);

  if (!armed) {
    return (
      <div className="metro-arm">
        <h1>mesh-metronome</h1>
        <p>
          4 phones, 4 polyrhythms, one mesh clock. Pick a subdivision in Settings (each phone picks
          its own), set the same BPM on all phones, then start.
        </p>
        <p className="metro-meta">
          This phone: <strong>{PATTERN[pattern].label}</strong> · {bpm} BPM
        </p>
        <button
          type="button"
          className="metro-arm-button"
          onClick={() => {
            void tone.resume();
            setArmed(true);
          }}
        >
          Connect to mesh
        </button>
      </div>
    );
  }

  const cellCount = Math.ceil(PATTERN[pattern].subdivisionsPerBar);
  // Which subdivision is lit right now, derived from the SHARED mesh-clock
  // phase (not a per-peer local timer): the same boundary test the cells use.
  // Exposed as a data attribute so the bar position is observable/diagnosable
  // — peers on the same mesh clock, BPM, and pattern light the same cell.
  // -1 while idle / between the last sub-boundary and the end of the bar.
  const subs = PATTERN[pattern].subdivisionsPerBar;
  const isActive = (i: number) => running && phase >= i / subs && phase < (i + 1) / subs;
  let activeCell = -1;
  for (let i = 0; i < cellCount; i++) {
    if (isActive(i)) {
      activeCell = i;
      break;
    }
  }

  return (
    <div
      className="metro-stage"
      style={{ "--accent": PATTERN[pattern].color } as React.CSSProperties}
    >
      <div className="metro-hud">
        {peers + 1} phones · {PATTERN[pattern].label} · {bpm} BPM
      </div>

      {mismatchedBpms.length > 0 && (
        <div className="metro-warn" role="status">
          BPM mismatch — {mismatchedBpms.join(", ")} on the mesh, you're at {bpm}. Set every phone
          to the same BPM in Settings or the polyrhythm won't lock.
        </div>
      )}

      <div className="metro-bar" data-active-cell={activeCell}>
        {Array.from({ length: cellCount }).map((_, i) => {
          const active = isActive(i);
          return <div key={i} className={`metro-cell ${active ? "active" : ""}`} />;
        })}
      </div>

      <button
        type="button"
        className={`metro-run ${running ? "running" : ""}`}
        onClick={() => setRunning((r) => !r)}
      >
        {running ? "Stop" : "Start"}
      </button>

      <p className="metro-help">
        Every phone plays the same BPM but a different subdivision, all locked to mesh time.
      </p>
    </div>
  );
}

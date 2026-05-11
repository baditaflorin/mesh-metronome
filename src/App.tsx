import { useEffect, useState } from "react";
import { Metronome, type PatternId } from "./features/metronome/Metronome";
import { SettingsDrawer } from "./features/settings/SettingsDrawer";
import { appConfig } from "./shared/config";

const STORAGE = {
  room: `${appConfig.storagePrefix}:room`,
  pattern: `${appConfig.storagePrefix}:pattern`,
  bpm: `${appConfig.storagePrefix}:bpm`,
  haptic: `${appConfig.storagePrefix}:haptic`,
};

const ALL_PATTERNS: PatternId[] = ["quarter", "eighth", "triplet", "dotted-eighth", "fives"];

export function App() {
  const [roomId, setRoomId] = useState(() => localStorage.getItem(STORAGE.room) ?? "default");
  const [pattern, setPattern] = useState<PatternId>(() => {
    const v = localStorage.getItem(STORAGE.pattern);
    return ALL_PATTERNS.includes(v as PatternId) ? (v as PatternId) : "quarter";
  });
  const [bpm, setBpm] = useState(() => Number(localStorage.getItem(STORAGE.bpm) ?? "120"));
  const [haptic, setHaptic] = useState(() => (localStorage.getItem(STORAGE.haptic) ?? "0") === "1");
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE.room, roomId);
  }, [roomId]);
  useEffect(() => {
    localStorage.setItem(STORAGE.pattern, pattern);
  }, [pattern]);
  useEffect(() => {
    localStorage.setItem(STORAGE.bpm, String(bpm));
  }, [bpm]);
  useEffect(() => {
    localStorage.setItem(STORAGE.haptic, haptic ? "1" : "0");
  }, [haptic]);

  return (
    <div className="app-root">
      <Metronome roomId={roomId} pattern={pattern} bpm={bpm} haptic={haptic} />

      <button
        type="button"
        className="settings-fab"
        onClick={() => setSettingsOpen(true)}
        aria-label="Open settings"
      >
        ⚙
      </button>

      <div className="self-ref">
        <a href={appConfig.repositoryUrl} target="_blank" rel="noreferrer">
          source
        </a>
        <span aria-hidden="true">·</span>
        <a href={appConfig.paypalUrl} target="_blank" rel="noreferrer">
          tip ♥
        </a>
        <span aria-hidden="true">·</span>
        <span>
          v{appConfig.version} · {appConfig.commit}
        </span>
      </div>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        roomId={roomId}
        onRoomChange={setRoomId}
        pattern={pattern}
        onPatternChange={setPattern}
        bpm={bpm}
        onBpmChange={setBpm}
        haptic={haptic}
        onHapticChange={setHaptic}
      />
    </div>
  );
}

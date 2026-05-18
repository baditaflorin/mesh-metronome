import { useEffect, useState } from "react";
import { MeshShell } from "@baditaflorin/mesh-common";
import { Metronome, type PatternId } from "./features/metronome/Metronome";
import { SettingsExtras } from "./features/settings/SettingsExtras";
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
    <MeshShell
      config={appConfig}
      roomId={roomId}
      onRoomChange={setRoomId}
      settingsExtras={
        <SettingsExtras
          pattern={pattern}
          onPatternChange={setPattern}
          bpm={bpm}
          onBpmChange={setBpm}
          haptic={haptic}
          onHapticChange={setHaptic}
        />
      }
    >
      <Metronome roomId={roomId} pattern={pattern} bpm={bpm} haptic={haptic} />
    </MeshShell>
  );
}

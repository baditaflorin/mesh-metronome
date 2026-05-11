import { useEffect, useState } from "react";
import {
  loadSignalingUrl,
  loadTurnTokenUrl,
  resetIceServers,
  saveSignalingUrl,
  saveTurnTokenUrl,
} from "../sync/iceConfig";
import { appConfig } from "../../shared/config";
import type { PatternId } from "../metronome/Metronome";

const PATTERNS: { id: PatternId; label: string }[] = [
  { id: "quarter", label: "quarter (♩)" },
  { id: "eighth", label: "eighth (♫)" },
  { id: "triplet", label: "triplet (3:2)" },
  { id: "dotted-eighth", label: "dotted eighth (3:8)" },
  { id: "fives", label: "five-against-four (5:4)" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  roomId: string;
  onRoomChange: (next: string) => void;
  pattern: PatternId;
  onPatternChange: (next: PatternId) => void;
  bpm: number;
  onBpmChange: (next: number) => void;
  haptic: boolean;
  onHapticChange: (next: boolean) => void;
};

export function SettingsDrawer(props: Props) {
  const {
    open,
    onClose,
    roomId,
    onRoomChange,
    pattern,
    onPatternChange,
    bpm,
    onBpmChange,
    haptic,
    onHapticChange,
  } = props;
  const [signaling, setSignaling] = useState(loadSignalingUrl());
  const [tokenUrl, setTokenUrl] = useState(loadTurnTokenUrl());

  useEffect(() => {
    if (open) {
      setSignaling(loadSignalingUrl());
      setTokenUrl(loadTurnTokenUrl());
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-drawer" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>Settings</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <label>
          <span>Room ID</span>
          <input value={roomId} onChange={(e) => onRoomChange(e.target.value)} />
        </label>

        <label>
          <span>This phone's pattern</span>
          <select value={pattern} onChange={(e) => onPatternChange(e.target.value as PatternId)}>
            {PATTERNS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>BPM (must match across phones)</span>
          <input
            type="number"
            min={40}
            max={240}
            step={1}
            value={bpm}
            onChange={(e) =>
              onBpmChange(Math.max(40, Math.min(240, Number(e.target.value) || 120)))
            }
          />
        </label>

        <label className="settings-check">
          <input
            type="checkbox"
            checked={haptic}
            onChange={(e) => onHapticChange(e.target.checked)}
          />
          <span>Vibrate on each click</span>
        </label>

        <hr />

        <h3>Self-hosted infra (advanced)</h3>
        <p className="settings-help">Override the default signaling and TURN endpoints.</p>

        <label>
          <span>Signaling URL</span>
          <input
            value={signaling}
            onChange={(e) => setSignaling(e.target.value)}
            placeholder={appConfig.signalingUrl}
          />
        </label>

        <label>
          <span>TURN credentials URL</span>
          <input
            value={tokenUrl}
            onChange={(e) => setTokenUrl(e.target.value)}
            placeholder={appConfig.turnTokenUrl}
          />
        </label>

        <div className="settings-actions">
          <button
            type="button"
            onClick={() => {
              saveSignalingUrl(signaling);
              saveTurnTokenUrl(tokenUrl);
              onClose();
              location.reload();
            }}
          >
            Save and reload
          </button>
          <button
            type="button"
            onClick={() => {
              saveSignalingUrl("");
              saveTurnTokenUrl("");
              resetIceServers();
              onClose();
              location.reload();
            }}
          >
            Reset to defaults
          </button>
        </div>

        <hr />

        <footer className="settings-footer">
          <a href={appConfig.repositoryUrl} target="_blank" rel="noreferrer">
            source on github
          </a>
          <span>
            v{appConfig.version} · {appConfig.commit}
          </span>
        </footer>
      </div>
    </div>
  );
}

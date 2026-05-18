import type { PatternId } from "../metronome/Metronome";

const PATTERNS: { id: PatternId; label: string }[] = [
  { id: "quarter", label: "quarter (♩)" },
  { id: "eighth", label: "eighth (♫)" },
  { id: "triplet", label: "triplet (3:2)" },
  { id: "dotted-eighth", label: "dotted eighth (3:8)" },
  { id: "fives", label: "five-against-four (5:4)" },
];

type Props = {
  pattern: PatternId;
  onPatternChange: (next: PatternId) => void;
  bpm: number;
  onBpmChange: (next: number) => void;
  haptic: boolean;
  onHapticChange: (next: boolean) => void;
};

export function SettingsExtras({
  pattern,
  onPatternChange,
  bpm,
  onBpmChange,
  haptic,
  onHapticChange,
}: Props) {
  return (
    <>
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
          onChange={(e) => onBpmChange(Math.max(40, Math.min(240, Number(e.target.value) || 120)))}
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
    </>
  );
}

import { PALETTE } from "../theme";

export function ColorSwatches({ value, onChange, size }: { value: string; onChange: (color: string) => void; size?: number }) {
  const s = size || 16;
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
      {PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          style={{
            width: s, height: s, borderRadius: "50%", background: c, padding: 0, cursor: "pointer",
            border: value === c ? "2px solid #1D1D1F" : "2px solid transparent",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.06)",
          }}
          aria-label={c}
        />
      ))}
    </div>
  );
}

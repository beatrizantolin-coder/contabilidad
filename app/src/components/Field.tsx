import type { ReactNode } from "react";
import { T } from "../theme";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.03em", textTransform: "uppercase", color: T.textMuted, fontWeight: 600 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

import { ArrowLeftRight, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import type { CategoryKind } from "../types";
import { T } from "../theme";

export function KindBadge({ kind, size }: { kind: CategoryKind; size: number }) {
  if (kind === "income") return <ArrowUpCircle size={size} style={{ color: T.income, flexShrink: 0 }} />;
  if (kind === "transfer")
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", border: "1.5px solid " + T.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <ArrowLeftRight size={size - 6} style={{ color: T.accent }} />
      </div>
    );
  return <ArrowDownCircle size={size} style={{ color: T.expense, flexShrink: 0 }} />;
}

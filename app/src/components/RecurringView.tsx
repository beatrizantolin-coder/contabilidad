import { Plus } from "lucide-react";
import type { Category, ID, Transaction } from "../types";
import { T, dot } from "../theme";
import { fmt, freqLabel, nextDate, shortDate } from "../lib/format";
import { catInfo } from "../lib/categories";

export function RecurringView({
  docName,
  recurringList,
  netPerMonth,
  categories,
  accountName,
  onNewScheduled,
}: {
  docName: string;
  recurringList: Transaction[];
  netPerMonth: number;
  categories: Category[];
  accountName: (id: ID) => string;
  onNewScheduled: () => void;
}) {
  return (
    <div style={{ padding: "20px 24px", overflow: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <div>
          <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 17, fontWeight: 700, margin: 0 }}>Programador</h2>
          <p style={{ fontSize: 12.5, color: T.textMuted, margin: "4px 0 0" }}>Movimientos recurrentes en {docName}.</p>
        </div>
        <button onClick={onNewScheduled} style={{ display: "flex", alignItems: "center", gap: 6, background: T.accent, border: "none", color: "#fff", borderRadius: 6, padding: "7px 13px", fontSize: 13, fontWeight: 600 }}>
          <Plus size={14} /> Nueva programada
        </button>
      </div>

      {recurringList.length === 0 && <div style={{ fontSize: 13, color: T.textFaint, marginTop: 18 }}>Sin movimientos recurrentes todavia.</div>}

      {recurringList.length > 0 && (
        <div style={{ margin: "18px 0", fontSize: 13, color: T.textMuted }}>
          Neto recurrente:{" "}
          <span className="amount" style={{ color: netPerMonth < 0 ? T.expense : T.income, fontWeight: 700 }}>
            {fmt(netPerMonth)}
          </span>{" "}
          / mes
        </div>
      )}

      {recurringList.length > 0 && (
        <div style={{ border: "1px solid " + T.border, borderRadius: 10, overflow: "hidden" }}>
          {recurringList.map((t, i) => {
            if (!t.recurring) return null;
            const info = t.type === "income" || t.type === "expense" ? catInfo(categories, t.categoryId, t.subcategoryId, t.subsubcategoryId) : { name: "-", color: T.textFaint };
            const color = t.type === "income" ? T.income : t.type === "transfer" ? T.transfer : T.expense;
            return (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: i === recurringList.length - 1 ? "none" : "1px solid " + T.borderSoft }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ marginTop: 5, ...dot(info.color, 9) }} />
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 500 }}>{t.name}</div>
                    <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>
                      {info.name} - {freqLabel(t.recurring)} - {accountName(t.accountId)} - proxima {shortDate(nextDate(t.date, t.recurring))}
                    </div>
                  </div>
                </div>
                <span className="amount" style={{ fontSize: 14, color, fontWeight: 600 }}>
                  {t.type === "income" ? "+" : "-"}
                  {fmt(Math.abs(t.amount))}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

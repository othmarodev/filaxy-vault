import { useEffect, useState } from "react";
import type { HealthReport, HealthItem } from "../types";
import { useT } from "../i18n/I18nContext";
import * as api from "../api";

const R = 52;
const CIRC = 2 * Math.PI * R;

function scoreColor(s: number): string {
  if (s >= 80) return "#22c55e";
  if (s >= 50) return "#f59e0b";
  return "#ef4444";
}

function Category({
  label, icon, color, items, onOpen,
}: {
  label: string; icon: string; color: string; items: HealthItem[]; onOpen: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--fv-border)", background: "var(--fv-surface)" }}>
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--fv-border)" }}>
        <span className="text-lg">{icon}</span>
        <span className="font-semibold flex-1" style={{ color: "var(--fv-text)" }}>{label}</span>
        <span className="text-sm font-semibold px-2 py-0.5 rounded-full" style={{ background: `${color}1f`, color }}>{items.length}</span>
      </div>
      <ul className="p-2 space-y-1 max-h-56 overflow-auto">
        {items.map((it) => (
          <li key={it.id}>
            <button
              onClick={() => onOpen(it.id)}
              className="fv-row w-full text-left px-3 py-2 rounded-lg text-sm truncate"
              style={{ color: "var(--fv-text)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--fv-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {it.title || "—"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HealthView({ onOpenEntry }: { onOpenEntry: (id: string) => void }) {
  const t = useT();
  const [report, setReport] = useState<HealthReport | null>(null);

  useEffect(() => { api.healthReport().then(setReport).catch(() => {}); }, []);

  const score = report?.score ?? 0;
  const color = scoreColor(score);
  const issues = report ? report.weak.length + report.reused.length + report.old.length + report.expired.length + report.duplicates.length : 0;

  return (
    <div className="fv-fade-in h-full overflow-auto px-6 py-6" style={{ background: "transparent" }}>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold" style={{ color: "var(--fv-text)" }}>{t("health")}</h1>
        <p className="text-sm mt-1 mb-6" style={{ color: "var(--fv-muted)" }}>{t("healthSubtitle")}</p>

        {/* score ring */}
        <div className="flex items-center gap-5 p-5 rounded-2xl border mb-6" style={{ borderColor: "var(--fv-border)", background: "var(--fv-surface)", boxShadow: "var(--fv-shadow)" }}>
          <div className="relative shrink-0" style={{ width: 128, height: 128 }}>
            <svg width="128" height="128" viewBox="0 0 128 128" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="64" cy="64" r={R} fill="none" stroke="var(--fv-border)" strokeWidth="10" />
              <circle cx="64" cy="64" r={R} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
                strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - score / 100)}
                style={{ transition: "stroke-dashoffset .6s ease, stroke .3s ease" }} />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ color }}>{score}</div>
                <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--fv-faint)" }}>/100</div>
              </div>
            </div>
          </div>
          <div>
            <div className="text-lg font-semibold" style={{ color: "var(--fv-text)" }}>{t("healthScore")}</div>
            <div className="text-sm mt-1" style={{ color: "var(--fv-muted)" }}>
              {report ? `${report.total} ${t("allItems").toLowerCase()} · ${issues} ${issues === 1 ? "issue" : "issues"}` : "…"}
            </div>
          </div>
        </div>

        {report && issues === 0 ? (
          <div className="text-center py-10 rounded-2xl border" style={{ borderColor: "var(--fv-border)", background: "var(--fv-surface)" }}>
            <div className="text-4xl mb-2">✅</div>
            <div className="font-medium" style={{ color: "var(--fv-muted)" }}>{t("allHealthy")}</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Category label={t("weakPasswords")} icon="⚠️" color="#ef4444" items={report?.weak ?? []} onOpen={onOpenEntry} />
            <Category label={t("reusedPasswords")} icon="♻️" color="#f59e0b" items={report?.reused ?? []} onOpen={onOpenEntry} />
            <Category label={t("oldPasswords")} icon="🕰️" color="#0ea5e9" items={report?.old ?? []} onOpen={onOpenEntry} />
            <Category label={t("expiredItems")} icon="⌛" color="#ef4444" items={report?.expired ?? []} onOpen={onOpenEntry} />
            <Category label={t("duplicateEntries")} icon="🧬" color="#a855f7" items={report?.duplicates ?? []} onOpen={onOpenEntry} />
          </div>
        )}
      </div>
    </div>
  );
}

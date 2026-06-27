import { useEffect, useMemo, useState } from "react";
import type { EntrySummary } from "../types";
import { useT } from "../i18n/I18nContext";
import * as api from "../api";

function Metric({ label, value, icon }: { label: string; value: number | string; icon: string }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: "var(--fv-border)", background: "var(--fv-surface)" }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs uppercase tracking-wide" style={{ color: "var(--fv-faint)" }}>{label}</span>
      </div>
      <div className="text-2xl font-bold" style={{ color: "var(--fv-text)" }}>{value}</div>
    </div>
  );
}

function scoreColor(s: number): string {
  if (s >= 80) return "#22c55e";
  if (s >= 50) return "#f59e0b";
  return "#ef4444";
}

export function StatsView({ entries, onPickType }: { entries: EntrySummary[]; onPickType: (kind: string) => void }) {
  const t = useT();
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => { api.healthReport().then((r) => setScore(r.score)).catch(() => {}); }, [entries]);

  const s = useMemo(() => {
    const live = entries.filter((e) => !e.trashed);
    const by = (k: string) => live.filter((e) => e.kind === k).length;
    return {
      total: live.length,
      login: by("login"),
      seed: by("seed"),
      totp: by("totp"),
      note: by("note"),
      card: by("card"),
      identity: by("identity"),
      favorites: live.filter((e) => e.favorite).length,
      withTotp: live.filter((e) => e.has_totp || e.kind === "totp").length,
      attachments: live.reduce((n, e) => n + e.attachment_count, 0),
      folders: new Set(live.filter((e) => e.group).map((e) => e.group)).size,
      tags: new Set(live.flatMap((e) => e.tags)).size,
    };
  }, [entries]);

  const types: { key: string; label: string; icon: string; count: number; filter: string }[] = [
    { key: "login", label: t("genPassword"), icon: "🔑", count: s.login, filter: "all" },
    { key: "totp", label: t("authenticator"), icon: "⏱️", count: s.totp, filter: "totp" },
    { key: "seed", label: t("crypto"), icon: "🪙", count: s.seed, filter: "crypto" },
    { key: "note", label: t("itemNote"), icon: "📝", count: s.note, filter: "notes" },
    { key: "card", label: t("itemCard"), icon: "💳", count: s.card, filter: "cards" },
    { key: "identity", label: t("itemIdentity"), icon: "🪪", count: s.identity, filter: "identities" },
  ];
  const max = Math.max(1, ...types.map((x) => x.count));

  return (
    <div className="fv-fade-in h-full overflow-auto px-6 py-6" style={{ background: "transparent" }}>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold" style={{ color: "var(--fv-text)" }}>{t("stats")}</h1>
        <p className="text-sm mt-1 mb-6" style={{ color: "var(--fv-muted)" }}>{t("statsSubtitle")}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Metric label={t("totalItems")} value={s.total} icon="◆" />
          <Metric label={t("favorites")} value={s.favorites} icon="★" />
          <Metric label={t("withTotp")} value={s.withTotp} icon="⏱️" />
          <Metric label={t("attachmentsCount")} value={s.attachments} icon="📎" />
          <Metric label={t("folders")} value={s.folders} icon="🗂" />
          <Metric label={t("tags")} value={s.tags} icon="#" />
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--fv-border)", background: "var(--fv-surface)" }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🩺</span>
              <span className="text-xs uppercase tracking-wide" style={{ color: "var(--fv-faint)" }}>{t("health")}</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: score == null ? "var(--fv-muted)" : scoreColor(score) }}>{score == null ? "…" : score}</div>
          </div>
        </div>

        {/* breakdown by type */}
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--fv-border)", background: "var(--fv-surface)" }}>
          <div className="text-sm font-semibold mb-4" style={{ color: "var(--fv-text)" }}>{t("byType")}</div>
          <div className="space-y-2.5">
            {types.map((ty) => (
              <button key={ty.key} onClick={() => onPickType(ty.filter)} className="fv-row w-full flex items-center gap-3 text-left">
                <span className="w-28 shrink-0 text-sm flex items-center gap-1.5" style={{ color: "var(--fv-muted)" }}><span>{ty.icon}</span>{ty.label}</span>
                <span className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "var(--fv-surface-2)" }}>
                  <span className="block h-full rounded-full" style={{ width: `${(ty.count / max) * 100}%`, background: "linear-gradient(90deg,#7c3aed,#0ea5e9)" }} />
                </span>
                <span className="w-8 text-right text-sm font-semibold tabular-nums" style={{ color: "var(--fv-text)" }}>{ty.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

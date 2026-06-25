export function EntropyMeter({ bits }: { bits: number }) {
  const pct = Math.min(100, (bits / 128) * 100);
  const color = bits < 40 ? "#ef4444" : bits < 70 ? "#f59e0b" : "#22c55e";
  return (
    <div>
      <div className="h-2 rounded-full" style={{ background: "var(--fv-border)" }}>
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs" style={{ color: "var(--fv-muted)" }}>{Math.round(bits)} bits</span>
    </div>
  );
}

/** Filaxy Vault logo lockup: gradient padlock mark + wordmark. */
export function Logo({ size = 44 }: { size?: number }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="grid place-items-center rounded-2xl shadow-md"
        style={{ width: size, height: size, background: "linear-gradient(135deg,#7c3aed,#0ea5e9)" }}
      >
        <svg width={size * 0.52} height={size * 0.52} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="11" width="16" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          {/* Filaxy "F" inside the lock — brand mark must always be present */}
          <path d="M10 14h4M10 14v4M10 16.4h3" stroke="#fff" strokeWidth="1.7" />
        </svg>
      </span>
      <span className="text-xl font-bold tracking-tight bg-brand-grad bg-clip-text text-transparent">Filaxy™ Vault</span>
    </div>
  );
}

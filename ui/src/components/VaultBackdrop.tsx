/**
 * Subtle abstract vault-dial motif rendered behind the whole app.
 * Evokes a safe's combination dial without a literal photo — stays premium
 * and never hurts legibility (very low opacity, panels sit opaque on top).
 */
export function VaultBackdrop() {
  const ticks = Array.from({ length: 60 });
  const spokes = [0, 1, 2, 3];
  const bolts = Array.from({ length: 8 });

  return (
    <div className="fv-vault-backdrop" aria-hidden="true">
      <svg viewBox="-300 -300 600 600" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="fvDial" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>
        <g stroke="url(#fvDial)" fill="none" strokeLinecap="round">
          {/* concentric rings */}
          <circle r="258" strokeWidth="1.5" />
          <circle r="210" strokeWidth="3" />
          <circle r="120" strokeWidth="2" />
          <circle r="64" strokeWidth="8" />

          {/* combination tick marks */}
          {ticks.map((_, i) => {
            const a = (i / 60) * Math.PI * 2;
            const r1 = 210;
            const major = i % 5 === 0;
            const r2 = major ? 240 : 226;
            return (
              <line
                key={`t${i}`}
                x1={Math.cos(a) * r1}
                y1={Math.sin(a) * r1}
                x2={Math.cos(a) * r2}
                y2={Math.sin(a) * r2}
                strokeWidth={major ? 2.5 : 1}
              />
            );
          })}

          {/* handle spokes */}
          {spokes.map((i) => {
            const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
            return (
              <line
                key={`s${i}`}
                x1={Math.cos(a) * 60}
                y1={Math.sin(a) * 60}
                x2={Math.cos(a) * 124}
                y2={Math.sin(a) * 124}
                strokeWidth="12"
              />
            );
          })}

          {/* bolts ring */}
          {bolts.map((_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return <circle key={`b${i}`} cx={Math.cos(a) * 168} cy={Math.sin(a) * 168} r="6" strokeWidth="2.5" />;
          })}
        </g>
      </svg>
    </div>
  );
}

import type { ButtonHTMLAttributes, CSSProperties } from "react";

type Variant = "primary" | "ghost" | "danger";
type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant };

const base =
  "fv-btn relative overflow-hidden rounded-lg px-4 py-2 font-medium disabled:opacity-50 disabled:pointer-events-none";

/** Filled buttons (primary/danger): gradient + lift + glow + a shine sweep on hover. */
function Filled({
  className,
  glow,
  bgClass,
  bgStyle,
  children,
  style,
  ...rest
}: Props & { glow: string; bgClass?: string; bgStyle?: CSSProperties }) {
  return (
    <button
      className={`group ${base} text-white ${bgClass ?? ""} ${glow} ${className ?? ""}`}
      style={{ ...bgStyle, ...style }}
      {...rest}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
      />
      <span className="relative z-10 inline-flex items-center justify-center gap-1.5">{children}</span>
    </button>
  );
}

export function Button({ variant = "primary", className = "", children, style, ...rest }: Props) {
  if (variant === "ghost") {
    return (
      <button
        className={`${base} border hover:bg-black/5 dark:hover:bg-white/10 hover:border-transparent hover:shadow-[0_8px_20px_-8px_var(--fv-ring)] ${className}`}
        style={{ borderColor: "var(--fv-border)", ...style }}
        {...rest}
      >
        {children}
      </button>
    );
  }

  if (variant === "danger") {
    return (
      <Filled
        className={className}
        style={style}
        glow="hover:shadow-[0_12px_28px_-6px_rgba(239,68,68,0.55)]"
        bgStyle={{ background: "linear-gradient(135deg,#f43f5e,#ef4444)" }}
        {...rest}
      >
        {children}
      </Filled>
    );
  }

  return (
    <Filled
      className={className}
      style={style}
      glow="hover:shadow-[0_12px_28px_-6px_rgba(124,58,237,0.55)]"
      bgClass="bg-brand-grad bg-[length:200%_100%] bg-left hover:bg-right"
      {...rest}
    >
      {children}
    </Filled>
  );
}

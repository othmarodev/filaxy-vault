import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" };

export function Button({ variant = "primary", className = "", children, ...rest }: Props) {
  const base =
    "fv-btn relative overflow-hidden rounded-lg px-4 py-2 font-medium disabled:opacity-50 disabled:pointer-events-none";

  if (variant === "ghost") {
    return (
      <button
        className={`${base} border hover:bg-black/5 dark:hover:bg-white/10 hover:border-transparent hover:shadow-[0_8px_20px_-8px_var(--fv-ring)] ${className}`}
        style={{ borderColor: "var(--fv-border)" }}
        {...rest}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      className={
        `group ${base} text-white bg-brand-grad bg-[length:200%_100%] bg-left hover:bg-right ` +
        `hover:shadow-[0_12px_28px_-6px_rgba(124,58,237,0.55)] ` +
        className
      }
      {...rest}
    >
      {/* shine sweep on hover */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
      />
      <span className="relative z-10">{children}</span>
    </button>
  );
}

import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" };

export function Button({ variant = "primary", className = "", ...rest }: Props) {
  const base = "px-4 py-2 rounded-lg font-medium transition active:scale-[0.98] disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-brand-grad text-white hover:brightness-110"
      : "border hover:bg-black/5 dark:hover:bg-white/10";
  return <button className={`${base} ${styles} ${className}`} style={{ borderColor: "var(--fv-border)" }} {...rest} />;
}

"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "danger";

const styles: Record<Variant, string> = {
  primary: "bg-brand text-brand-contrast active:bg-brand-dark",
  ghost: "bg-surface-sunken text-ink active:bg-line",
  danger: "bg-danger-bg text-danger-fg active:opacity-80",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function Button({ variant = "primary", className = "", children, ...rest }: ButtonProps) {
  return (
    <button
      className={`rounded-xl px-4 py-3 text-base font-semibold transition-colors motion-reduce:transition-none disabled:opacity-40 ${styles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

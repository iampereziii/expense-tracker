"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "danger";

const styles: Record<Variant, string> = {
  primary: "bg-brand text-white active:bg-brand-dark",
  ghost: "bg-surface-sunken text-ink active:bg-slate-200",
  danger: "bg-red-100 text-red-800 active:bg-red-200",
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

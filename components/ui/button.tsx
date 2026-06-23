import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClassName: Record<ButtonVariant, string> = {
  primary: "bg-[var(--color-primary)] text-white hover:bg-[#1118a6]",
  secondary: "bg-[var(--color-warning)] text-[#171717] hover:bg-[#f6e85e]",
  danger: "bg-[var(--color-danger)] text-white hover:bg-[#d80a2b]",
  ghost: "bg-white text-[var(--color-primary)] ring-1 ring-slate-200 hover:bg-slate-50",
};

export function Button({
  className = "",
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variantClassName[variant]} ${className}`}
      {...props}
    />
  );
}

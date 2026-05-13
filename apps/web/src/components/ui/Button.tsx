import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "warning";
type ButtonSize = "sm" | "md" | "icon";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const baseClassName =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:cursor-not-allowed disabled:opacity-60";

const variantClassNames: Record<ButtonVariant, string> = {
  primary: "bg-cyan-400 text-cyan-950 hover:bg-cyan-300",
  secondary: "border border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900",
  ghost: "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200",
  danger: "bg-rose-500 text-white hover:bg-rose-400",
  warning: "bg-amber-500 text-amber-950 hover:bg-amber-400",
};

const sizeClassNames: Record<ButtonSize, string> = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-2 text-sm",
  icon: "p-2.5 text-sm",
};

export function Button({
  className = "",
  size = "md",
  type = "button",
  variant = "secondary",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${baseClassName} ${variantClassNames[variant]} ${sizeClassNames[size]} ${className}`}
      {...props}
    />
  );
}

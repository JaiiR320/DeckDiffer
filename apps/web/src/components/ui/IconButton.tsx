import type { ComponentPropsWithRef } from "react";

type IconButtonVariant = "secondary" | "ghost" | "active" | "danger" | "warning";
type IconButtonSize = "sm" | "md" | "lg";

type IconButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
};

const baseClassName =
  "inline-flex items-center justify-center transition disabled:cursor-not-allowed disabled:opacity-50";

const variantClassNames: Record<IconButtonVariant, string> = {
  secondary:
    "rounded-xl border border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900",
  ghost: "rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300",
  active: "rounded-md border border-cyan-500/70 bg-cyan-500/15 text-cyan-300",
  danger: "rounded-lg text-rose-400 hover:bg-rose-950/30 hover:text-rose-200",
  warning: "rounded-lg text-amber-300 hover:bg-amber-900/30 hover:text-amber-100",
};

const sizeClassNames: Record<IconButtonSize, string> = {
  sm: "size-7",
  md: "p-2.5",
  lg: "size-12 rounded-full",
};

export function IconButton({
  className = "",
  size = "md",
  type = "button",
  variant = "secondary",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={`${baseClassName} ${variantClassNames[variant]} ${sizeClassNames[size]} ${className}`}
      {...props}
    />
  );
}

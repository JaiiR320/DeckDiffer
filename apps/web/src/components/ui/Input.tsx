import type { InputHTMLAttributes } from "react";

type InputSize = "sm" | "md";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  inputSize?: InputSize;
};

const baseClassName =
  "rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-500";

const sizeClassNames: Record<InputSize, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-4 py-3 text-base",
};

export function Input({ className = "", inputSize = "md", ...props }: InputProps) {
  return (
    <input className={`${baseClassName} ${sizeClassNames[inputSize]} ${className}`} {...props} />
  );
}

import type { TextareaHTMLAttributes } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

const baseClassName =
  "rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-500";

export function Textarea({ className = "", ...props }: TextareaProps) {
  return <textarea className={`${baseClassName} ${className}`} {...props} />;
}

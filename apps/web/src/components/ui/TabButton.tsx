import type { ButtonHTMLAttributes } from "react";

type TabButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active: boolean;
};

export function TabButton({ active, className = "", type = "button", ...props }: TabButtonProps) {
  return (
    <button
      type={type}
      className={`px-5 py-3 text-sm font-medium transition ${
        active ? "border-b-2 border-cyan-400 text-cyan-400" : "text-zinc-500 hover:text-zinc-300"
      } ${className}`}
      {...props}
    />
  );
}

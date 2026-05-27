import { use } from "react";
import type { ReactNode } from "react";
import { ContextMenuCloseContext } from "./ContextMenuShared";

type ContextMenuItemProps = {
  children: ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  closeOnSelect?: boolean;
  tone?: "default" | "danger" | "muted";
  title?: string;
};

export function ContextMenuItem({
  children,
  onSelect,
  disabled = false,
  closeOnSelect = true,
  tone = "default",
  title,
}: ContextMenuItemProps) {
  const close = use(ContextMenuCloseContext);
  const toneClass =
    tone === "danger"
      ? "text-rose-400 hover:bg-rose-950/20"
      : tone === "muted"
        ? "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
        : "text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100";

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      title={title}
      onClick={() => {
        onSelect?.();
        if (closeOnSelect) close?.();
      }}
      className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${toneClass}`}
    >
      {children}
    </button>
  );
}

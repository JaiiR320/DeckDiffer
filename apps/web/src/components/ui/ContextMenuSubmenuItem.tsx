import { ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { contextMenuClassName } from "./ContextMenuShared";

const viewportPadding = 8;

type ContextMenuSubmenuItemProps = {
  children: ReactNode;
  submenu: ReactNode;
  disabled?: boolean;
  title?: string;
};

export function ContextMenuSubmenuItem({
  children,
  submenu,
  disabled = false,
  title,
}: ContextMenuSubmenuItemProps) {
  const submenuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [submenuTop, setSubmenuTop] = useState(0);

  useEffect(() => {
    if (!open) {
      setSubmenuTop(0);
      return;
    }

    function updateSubmenuPosition() {
      const submenu = submenuRef.current;
      if (!submenu) return;

      const rect = submenu.getBoundingClientRect();
      const overflowBottom = rect.bottom - (window.innerHeight - viewportPadding);
      const maxShiftUp = Math.max(0, rect.top - viewportPadding);
      setSubmenuTop(overflowBottom > 0 ? -Math.min(overflowBottom, maxShiftUp) : 0);
    }

    updateSubmenuPosition();
    window.addEventListener("resize", updateSubmenuPosition);
    return () => window.removeEventListener("resize", updateSubmenuPosition);
  }, [open]);

  return (
    <div
      className="relative"
      onPointerEnter={() => {
        if (!disabled) setOpen(true);
      }}
      onPointerLeave={() => setOpen(false)}
    >
      <button
        type="button"
        role="menuitem"
        disabled={disabled}
        title={title}
        onFocus={() => {
          if (!disabled) setOpen(true);
        }}
        onClick={() => {
          if (!disabled) setOpen(true);
        }}
        className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-300 transition hover:bg-zinc-900 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span>{children}</span>
        <ChevronRight className="size-4 text-zinc-500" strokeWidth={1.75} />
      </button>
      {open && !disabled ? (
        <>
          <div aria-hidden="true" className="absolute left-full top-0 h-full w-2" />
          <div
            ref={submenuRef}
            role="menu"
            className={`absolute left-[calc(100%+0.5rem)] z-[1101] w-48 ${contextMenuClassName}`}
            style={{ top: submenuTop }}
          >
            {submenu}
          </div>
        </>
      ) : null}
    </div>
  );
}

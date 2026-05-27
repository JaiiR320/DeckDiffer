import {
  createContext,
  use,
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";

type ContextMenuPlacement = "bottom-end" | "bottom-start" | "left-start" | "right-start";

type ContextMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchorRef?: RefObject<HTMLElement | null>;
  position?: { x: number; y: number } | null;
  placement?: ContextMenuPlacement;
  widthClassName?: string;
  children: ReactNode;
};

type ContextMenuItemProps = {
  children: ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  closeOnSelect?: boolean;
  tone?: "default" | "danger" | "muted";
  title?: string;
};

const menuPadding = 8;
const menuGap = 8;
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const ContextMenuCloseContext = createContext<(() => void) | null>(null);

export function ContextMenu({
  open,
  onOpenChange,
  anchorRef,
  position,
  placement = "bottom-end",
  widthClassName = "w-56",
  children,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<{ left: number; top: number; opacity: number } | null>(null);
  const closeMenu = useCallback(() => onOpenChange(false), [onOpenChange]);
  const closeMenuFromEffect = useEffectEvent(closeMenu);

  useIsomorphicLayoutEffect(() => {
    if (!open) {
      setStyle(null);
      return;
    }

    function updatePosition() {
      const menu = menuRef.current;
      if (!menu) return;

      const menuRect = menu.getBoundingClientRect();
      const anchorRect = anchorRef?.current?.getBoundingClientRect();
      const base = position ?? (anchorRect ? getAnchorPosition(anchorRect, placement) : null);
      if (!base) return;

      let left = base.x;
      let top = base.y;

      if (anchorRect) {
        if (placement === "bottom-end") left = anchorRect.right - menuRect.width;
        if (placement === "left-start") left = anchorRect.left - menuRect.width - menuGap;
      }

      left = clamp(left, menuPadding, window.innerWidth - menuRect.width - menuPadding);
      top = clamp(top, menuPadding, window.innerHeight - menuRect.height - menuPadding);
      setStyle({ left, top, opacity: 1 });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorRef, open, placement, position]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || anchorRef?.current?.contains(target)) return;
      closeMenuFromEffect();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenuFromEffect();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [anchorRef, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <ContextMenuCloseContext.Provider value={closeMenu}>
      <div
        ref={menuRef}
        role="menu"
        className={`fixed z-[1100] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl shadow-black/50 ${widthClassName}`}
        style={style ?? { left: 0, top: 0, opacity: 0 }}
      >
        {children}
      </div>
    </ContextMenuCloseContext.Provider>,
    document.body,
  );
}

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

function getAnchorPosition(anchorRect: DOMRect, placement: ContextMenuPlacement) {
  if (placement === "bottom-start") return { x: anchorRect.left, y: anchorRect.bottom + menuGap };
  if (placement === "left-start") return { x: anchorRect.left, y: anchorRect.top };
  if (placement === "right-start") return { x: anchorRect.right + menuGap, y: anchorRect.top };
  return { x: anchorRect.right, y: anchorRect.bottom + menuGap };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

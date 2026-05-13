import { useEffect } from "react";
import type { ReactNode } from "react";

type ModalWidth = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";

type ModalProps = {
  children: ReactNode;
  onClose: () => void;
  ariaLabel: string;
  maxWidth?: ModalWidth;
  className?: string;
  panelClassName?: string;
};

const widthClassNames: Record<ModalWidth, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
};

let lockCount = 0;
let previousBodyOverflow = "";

export function Modal({
  ariaLabel,
  children,
  className = "items-center justify-center px-6",
  maxWidth = "md",
  onClose,
  panelClassName = "p-6",
}: ModalProps) {
  useLockBodyScroll();

  return (
    <div className={`fixed inset-0 z-50 flex bg-black/70 ${className}`}>
      <button type="button" aria-label={ariaLabel} className="absolute inset-0" onClick={onClose} />
      <div
        className={`relative z-10 w-full ${widthClassNames[maxWidth]} rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40 ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  );
}

function useLockBodyScroll() {
  useEffect(() => {
    if (lockCount === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    lockCount += 1;

    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        document.body.style.overflow = previousBodyOverflow;
      }
    };
  }, []);
}

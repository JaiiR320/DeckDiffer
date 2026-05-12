import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type DropdownSelectProps<Value extends string> = {
  value: Value;
  options: Array<{ value: Value; label: string }>;
  onChange: (value: Value) => void;
  "aria-label": string;
  className?: string;
};

export function DropdownSelect<Value extends string>({
  value,
  options,
  onChange,
  "aria-label": ariaLabel,
  className = "",
}: DropdownSelectProps<Value>) {
  const id = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={id}
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setIsOpen(false);
        }}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border bg-zinc-900 px-3 py-2.5 text-left text-sm text-zinc-300 outline-none transition hover:border-zinc-700 focus:border-cyan-500 ${
          isOpen ? "border-cyan-500/70 shadow-lg shadow-cyan-950/20" : "border-zinc-800"
        }`}
      >
        <span className="truncate">{selectedOption?.label}</span>
        <ChevronDown className="size-4 shrink-0 text-zinc-400" strokeWidth={1.75} />
      </button>

      {isOpen ? (
        <div
          id={id}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-1 shadow-2xl shadow-black/50"
        >
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                  isSelected
                    ? "bg-cyan-500/15 text-cyan-200"
                    : "text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

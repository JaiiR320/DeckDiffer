import { ChevronDown } from "lucide-react";

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
  return (
    <div className={`relative ${className}`}>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value as Value)}
        className="w-full appearance-none rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 pr-10 text-left text-sm text-zinc-300 outline-none transition hover:border-zinc-700 focus:border-cyan-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
        strokeWidth={1.75}
      />
    </div>
  );
}

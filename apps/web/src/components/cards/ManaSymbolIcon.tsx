type ManaSymbolIconProps = {
  symbol: string;
  label: string;
  className?: string;
};

export function ManaSymbolIcon({ symbol, label, className = "size-6" }: ManaSymbolIconProps) {
  return (
    <img
      src={`https://svgs.scryfall.io/card-symbols/${encodeURIComponent(symbol)}.svg`}
      alt={label}
      className={className}
      loading="lazy"
    />
  );
}

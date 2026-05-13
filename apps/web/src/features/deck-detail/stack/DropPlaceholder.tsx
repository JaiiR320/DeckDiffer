export function DropPlaceholder({ height }: { height: number }) {
  return (
    <div
      aria-hidden="true"
      className="rounded-xl border border-dashed border-cyan-500/40 bg-cyan-500/5 transition-all duration-150"
      style={{ minHeight: `${height}px` }}
    />
  );
}

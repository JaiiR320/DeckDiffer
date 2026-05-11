export function ErrorBanner({ children }: { children: string }) {
  return (
    <p className="mb-6 rounded-xl border border-rose-900/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">
      {children}
    </p>
  );
}

export function StatusMessage({ children }: { children: string }) {
  return (
    <main className="mx-auto w-full p-8">
      <p className="rounded-xl border border-rose-900/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">
        {children}
      </p>
    </main>
  );
}

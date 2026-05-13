import { Alert } from "#/components/ui/Alert";

export function ErrorBanner({ children }: { children: string }) {
  return <Alert className="mb-6 border-rose-900/40">{children}</Alert>;
}

export function StatusMessage({ children }: { children: string }) {
  return (
    <main className="mx-auto w-full p-8">
      <Alert className="border-rose-900/40">{children}</Alert>
    </main>
  );
}

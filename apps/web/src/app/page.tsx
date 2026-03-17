export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <main className="w-full max-w-xl px-6 py-16 space-y-8 text-center">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Welcome to
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Delivio
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Next.js + shadcn/ui frontend. Edit{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-[0.7rem]">
              src/app/page.tsx
            </code>{" "}
            to get started.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="https://ui.shadcn.com"
            className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            shadcn/ui
          </a>
          <a
            href="https://nextjs.org/docs"
            className="inline-flex items-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Next.js docs
          </a>
        </div>
      </main>
    </div>
  );
}

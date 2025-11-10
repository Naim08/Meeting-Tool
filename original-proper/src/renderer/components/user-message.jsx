export default function UserMessage({ children }) {
  return (
    <li className="mr-6 flex min-w-0 flex-1 flex-col gap-1">
      <p className="font-sans text-xs font-semibold uppercase tracking-wide text-secondary-foreground/80">
        You
      </p>
      <p className="min-w-0 rounded-xl border border-border/60 bg-card/95 p-3 font-sans text-sm text-foreground shadow-sm transition-colors dark:border-zinc-800/80 dark:bg-zinc-900/60 sm:p-4">
        {children}
      </p>
    </li>
  );
}

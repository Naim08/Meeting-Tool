import { useMarkdownProcessor } from "../hooks/use-markdown-processor";

function AssistantMessage({ children, data }) {
  const content = useMarkdownProcessor(children);
  const comparisonLabel =
    typeof data?.comparisonLabel === "string" && data.comparisonLabel.trim()
      ? data.comparisonLabel.trim()
      : null;
  const comparisonSlot =
    typeof data?.comparisonSlot === "string" && data.comparisonSlot.trim()
      ? data.comparisonSlot.trim()
      : null;
  const labelSuffix =
    comparisonLabel ??
    (comparisonSlot === "primary"
      ? "Primary"
      : comparisonSlot === "secondary"
      ? "Secondary"
      : null);
  const displayLabel = labelSuffix ? `AI • ${labelSuffix}` : "AI";

  return (
    <li className="ml-6 flex min-w-0 flex-1 flex-col gap-1 selection:bg-primary/20 selection:text-foreground">
      <p className="font-sans text-xs font-semibold uppercase tracking-wide text-primary">
        {displayLabel}
      </p>
      <div className="min-w-0 rounded-xl border border-border/60 bg-card/95 p-3 text-foreground shadow-sm transition-colors dark:border-zinc-800/80 dark:bg-zinc-900/60 lg:p-6 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
        {content}
      </div>
    </li>
  );
}

export default AssistantMessage;

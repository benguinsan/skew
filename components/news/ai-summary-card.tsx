import { ClockIcon, InfoIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { MockArticleAnalysis } from "@/lib/mock-articles";

type AiSummaryCardProps = {
  analysis: MockArticleAnalysis;
};

export function AiSummaryCard({ analysis }: AiSummaryCardProps) {
  return (
    <section className="rounded-lg border border-border bg-bg-primary p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-h4 font-semibold text-text-primary">AI Summary</h2>
        <span className="text-text-secondary" title="Generated summary">
          <InfoIcon />
        </span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-text-secondary">
        <span>{analysis.summaryDateLabel}</span>
        <span className="inline-flex items-center gap-1">
          <ClockIcon />
          {analysis.summaryReadTime}
        </span>
      </div>

      <ul className="space-y-2.5 text-body-sm leading-relaxed text-text-primary">
        {analysis.summaryBullets.map((bullet) => (
          <li key={bullet} className="flex gap-2">
            <span
              className="mt-2 h-1 w-1 shrink-0 rounded-full bg-text-primary"
              aria-hidden="true"
            />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-caption leading-relaxed text-text-secondary">
        {analysis.disclaimer}
      </p>

      <Button variant="outline" className="mt-5 w-full">
        Provide Feedback
      </Button>
    </section>
  );
}

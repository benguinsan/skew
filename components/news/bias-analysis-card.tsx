import { InfoIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  biasTextClass,
  dominantPercentage,
  formatBiasLabel,
  type ArticleDetailView,
} from "@/lib/articles/present";

type BiasAnalysisCardProps = {
  article: ArticleDetailView;
};

function ProgressRow({
  label,
  value,
  barClass,
  labelClass,
}: {
  label: string;
  value: number;
  barClass: string;
  labelClass: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-body-sm">
        <span className={["font-medium", labelClass].join(" ")}>{label}</span>
        <span className="text-text-secondary">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-bg-secondary">
        <div
          className={["h-full rounded-full", barClass].join(" ")}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function BiasAnalysisCard({ article }: BiasAnalysisCardProps) {
  const { analysis, leftPercentage, centerPercentage, rightPercentage } =
    article;
  const overallPct = dominantPercentage(article);
  const overallClass = biasTextClass(analysis.biasLabel);
  const confidencePct = Math.round(analysis.confidence * 100);

  return (
    <section className="rounded-lg border border-border bg-bg-primary p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-h4 font-semibold text-text-primary">
          Bias Analysis
        </h2>
        <span className="text-text-secondary" title="AI-estimated framing">
          <InfoIcon />
        </span>
      </div>

      <p className={["text-body-lg font-semibold", overallClass].join(" ")}>
        Overall Bias: {formatBiasLabel(analysis.biasLabel)} {overallPct}%
      </p>

      <p className="mt-1 text-caption text-text-secondary">
        Sentiment:{" "}
        {analysis.sentimentLabel.charAt(0).toUpperCase() +
          analysis.sentimentLabel.slice(1)}{" "}
        · Confidence: {confidencePct}%
      </p>

      <div className="mt-5 space-y-3">
        <ProgressRow
          label="Left"
          value={leftPercentage}
          barClass="bg-bias-left"
          labelClass="text-bias-left"
        />
        <ProgressRow
          label="Center"
          value={centerPercentage}
          barClass="bg-bias-center"
          labelClass="text-text-secondary"
        />
        <ProgressRow
          label="Right"
          value={rightPercentage}
          barClass="bg-bias-right"
          labelClass="text-bias-right"
        />
      </div>

      <p className="mt-5 text-body-sm leading-relaxed text-text-secondary">
        {analysis.framingNotes}
      </p>

      {analysis.loadedTerms.length > 0 ? (
        <div className="mt-4">
          <p className="text-caption font-medium uppercase tracking-wide text-text-secondary">
            Loaded terms
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {analysis.loadedTerms.map((term) => (
              <li
                key={term}
                className="rounded-full border border-border bg-surface px-2.5 py-1 text-caption text-text-primary"
              >
                {term}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Button variant="outline" className="mt-5 w-full">
        How We Analyze Bias
      </Button>
    </section>
  );
}

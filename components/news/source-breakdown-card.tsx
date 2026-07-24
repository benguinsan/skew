import { InfoIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  biasTextClass,
  formatBiasLabel,
  type MockSource,
  type SourceBiasLabel,
} from "@/lib/mock-articles";

type SourceBreakdownCardProps = {
  sources: MockSource[];
  totalSources: number;
  leftPercentage: number;
  centerPercentage: number;
  rightPercentage: number;
};

function countByBias(sources: MockSource[], label: SourceBiasLabel) {
  return sources.filter((source) => source.biasLabel === label).length;
}

export function SourceBreakdownCard({
  sources,
  totalSources,
  leftPercentage,
  centerPercentage,
  rightPercentage,
}: SourceBreakdownCardProps) {
  const leftCount = countByBias(sources, "left");
  const centerCount = countByBias(sources, "center");
  const rightCount = countByBias(sources, "right");

  return (
    <section className="rounded-lg border border-border bg-bg-primary p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-h4 font-semibold text-text-primary">
          Source Breakdown
        </h2>
        <span className="text-text-secondary" title="Mock multi-source panel">
          <InfoIcon />
        </span>
      </div>

      <p className="text-body-md font-semibold text-text-primary">
        {totalSources} Total Sources
      </p>

      <ul className="mt-3 space-y-1.5 text-body-sm text-text-secondary">
        <li>
          <span className="font-medium text-bias-left">Left</span> {leftCount} (
          {leftPercentage}%)
        </li>
        <li>
          <span className="font-medium text-text-secondary">Center</span>{" "}
          {centerCount} ({centerPercentage}%)
        </li>
        <li>
          <span className="font-medium text-bias-right">Right</span>{" "}
          {rightCount} ({rightPercentage}
          %)
        </li>
      </ul>

      <div className="mt-5 border-t border-divider pt-4">
        <p className="mb-3 text-caption font-medium uppercase tracking-wide text-text-secondary">
          Top Sources
        </p>
        <ul className="space-y-2.5">
          {sources.map((source) => (
            <li
              key={source.name}
              className="flex items-center justify-between gap-3 text-body-sm"
            >
              <span className="text-text-primary">{source.name}</span>
              <span
                className={[
                  "font-medium",
                  biasTextClass(source.biasLabel),
                ].join(" ")}
              >
                {formatBiasLabel(source.biasLabel)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <Button variant="outline" className="mt-5 w-full">
        View All Sources
      </Button>
    </section>
  );
}

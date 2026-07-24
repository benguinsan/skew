type BiasMeterProps = {
  left: number;
  center: number;
  right: number;
  /** Thin unlabeled bar (default) or taller bar with in-segment labels. */
  variant?: "default" | "labeled";
  className?: string;
};

function normalize(left: number, center: number, right: number) {
  const total = left + center + right;
  if (total <= 0) {
    return { left: 0, center: 100, right: 0 };
  }
  return {
    left: (left / total) * 100,
    center: (center / total) * 100,
    right: (right / total) * 100,
  };
}

function segmentLabel(
  kind: "left" | "center" | "right",
  widthPct: number,
  displayPct: number,
) {
  if (widthPct < 8) {
    return null;
  }

  if (kind === "left") {
    return widthPct < 14 ? `${displayPct}%` : `L ${displayPct}%`;
  }

  if (kind === "center") {
    return widthPct < 18 ? `${displayPct}%` : `Center ${displayPct}%`;
  }

  return widthPct < 16 ? `${displayPct}%` : `Right ${displayPct}%`;
}

export function BiasMeter({
  left,
  center,
  right,
  variant = "default",
  className = "",
}: BiasMeterProps) {
  const segments = normalize(left, center, right);
  const leftPct = Math.round(segments.left);
  const centerPct = Math.round(segments.center);
  const rightPct = Math.round(segments.right);

  const ariaLabel = `AI-estimated framing: left ${leftPct}%, center ${centerPct}%, right ${rightPct}%`;

  if (variant === "labeled") {
    return (
      <div
        className={[
          "flex h-7 w-full overflow-hidden rounded-sm text-[10px] font-medium leading-none",
          className,
        ].join(" ")}
        role="img"
        aria-label={ariaLabel}
      >
        {segments.left > 0 ? (
          <span
            className="flex h-full items-center justify-center bg-bias-left px-1 text-white"
            style={{ width: `${segments.left}%` }}
          >
            {segmentLabel("left", segments.left, leftPct)}
          </span>
        ) : null}
        {segments.center > 0 ? (
          <span
            className="flex h-full items-center justify-center bg-bias-center px-1 text-text-primary"
            style={{ width: `${segments.center}%` }}
          >
            {segmentLabel("center", segments.center, centerPct)}
          </span>
        ) : null}
        {segments.right > 0 ? (
          <span
            className="flex h-full items-center justify-center bg-bias-right px-1 text-white"
            style={{ width: `${segments.right}%` }}
          >
            {segmentLabel("right", segments.right, rightPct)}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={[
        "flex h-2 w-full overflow-hidden rounded-full bg-bias-center",
        className,
      ].join(" ")}
      role="img"
      aria-label={ariaLabel}
    >
      <span
        className="h-full bg-bias-left"
        style={{ width: `${segments.left}%` }}
      />
      <span
        className="h-full bg-bias-center"
        style={{ width: `${segments.center}%` }}
      />
      <span
        className="h-full bg-bias-right"
        style={{ width: `${segments.right}%` }}
      />
    </div>
  );
}

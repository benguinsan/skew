import type { ReactNode } from "react";

type ChipProps = {
  children: ReactNode;
  showPlus?: boolean;
  /** Where to place the plus when `showPlus` is true. Homepage uses trailing. */
  plusPosition?: "leading" | "trailing";
  className?: string;
};

export function Chip({
  children,
  showPlus = false,
  plusPosition = "trailing",
  className = "",
}: ChipProps) {
  const plus = showPlus ? (
    <span aria-hidden="true" className="text-text-secondary">
      +
    </span>
  ) : null;

  return (
    <span
      className={[
        "inline-flex h-10 min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-border bg-bg-primary px-3 text-body-sm text-text-primary",
        className,
      ].join(" ")}
    >
      {plusPosition === "leading" ? plus : null}
      {children}
      {plusPosition === "trailing" ? plus : null}
    </span>
  );
}

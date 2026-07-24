type LogoProps = {
  showSubtitle?: boolean;
  /** Stacked wordmark (default) or single-line header/footer wordmark. */
  variant?: "stacked" | "header" | "footer";
  className?: string;
};

export function Logo({
  showSubtitle = true,
  variant = "stacked",
  className = "",
}: LogoProps) {
  if (variant === "header" || variant === "footer") {
    const isFooter = variant === "footer";
    return (
      <p
        className={[
          "text-h3 font-bold tracking-tight",
          isFooter ? "text-white" : "text-text-primary",
          className,
        ].join(" ")}
      >
        biasly{" "}
        <span
          className={
            isFooter
              ? "font-semibold text-white/80"
              : "font-semibold text-text-secondary"
          }
        >
          News
        </span>
      </p>
    );
  }

  return (
    <div className={["leading-none", className].join(" ")}>
      <p className="text-h2 font-bold tracking-tight text-text-primary">
        biasly
      </p>
      {showSubtitle ? (
        <p className="mt-1 text-caption font-medium uppercase tracking-[0.08em] text-text-secondary">
          News
        </p>
      ) : null}
    </div>
  );
}

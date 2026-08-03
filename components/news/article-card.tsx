"use client";

import posthog from "posthog-js";
import { InfoIcon } from "@/components/icons";
import { BiasMeter } from "@/components/ui/bias-meter";

export type ArticleCardProps = {
  articleId: string;
  title: string;
  category: string;
  region: string;
  leftPercentage: number;
  centerPercentage: number;
  rightPercentage: number;
  sourceCount: number;
  href?: string;
  imageUrl?: string;
  /** Optional tint for placeholder image panel when imageUrl is missing. */
  imageTone?: string;
  className?: string;
};

export function ArticleCard({
  articleId,
  title,
  category,
  region,
  leftPercentage,
  centerPercentage,
  rightPercentage,
  sourceCount,
  href = "#",
  imageUrl,
  imageTone = "bg-bg-secondary",
  className = "",
}: ArticleCardProps) {
  const sourcesLabel =
    sourceCount === 1 ? "1 source" : `${sourceCount} sources`;

  return (
    <article className={["flex flex-col gap-3", className].join(" ")}>
      <a
        href={href}
        className="group block focus-visible:outline-none"
        onClick={() => {
          posthog.capture("article_opened", {
            article_id: articleId,
            category,
            region,
            source_count: sourceCount,
          });
        }}
      >
        <div
          className={[
            "relative aspect-16/10 overflow-hidden rounded-lg",
            imageTone,
          ].join(" ")}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- scraped/CDN hosts vary
            <img
              src={imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : null}
          <div className="absolute inset-0 bg-linear-to-t from-black/10 to-transparent" />
          <span
            className="absolute right-2.5 top-2.5 text-text-primary drop-shadow-sm"
            title="Story info"
          >
            <InfoIcon />
          </span>
        </div>
      </a>

      <div className="flex flex-1 flex-col gap-2">
        <p className="text-caption font-medium uppercase tracking-wide text-text-secondary">
          {category} · {region}
        </p>

        <h3 className="text-h4 font-semibold leading-[1.35] text-text-primary sm:text-h3 sm:leading-[1.3]">
          <a
            href={href}
            className="transition-opacity hover:opacity-80 focus-visible:underline focus-visible:outline-none"
            onClick={() => {
              posthog.capture("article_opened", {
                article_id: articleId,
                category,
                region,
                source_count: sourceCount,
              });
            }}
          >
            {title}
          </a>
        </h3>

        <div className="mt-auto space-y-2 pt-1">
          <BiasMeter
            variant="labeled"
            left={leftPercentage}
            center={centerPercentage}
            right={rightPercentage}
          />
          <p className="text-caption text-text-secondary">{sourcesLabel}</p>
        </div>
      </div>
    </article>
  );
}

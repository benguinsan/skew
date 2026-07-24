import Link from "next/link";
import type { MockRelatedStory } from "@/lib/mock-articles";

type RelatedStoryCardProps = {
  story: MockRelatedStory;
};

export function RelatedStoryCard({ story }: RelatedStoryCardProps) {
  return (
    <article className="flex gap-3">
      <Link
        href={`/news/${story.id}`}
        className={[
          "relative h-20 w-20 shrink-0 overflow-hidden rounded-md",
          story.imageTone ?? "bg-bg-secondary",
        ].join(" ")}
        aria-hidden="true"
        tabIndex={-1}
      >
        <span className="absolute inset-0 bg-linear-to-t from-black/10 to-transparent" />
      </Link>

      <div className="min-w-0 flex-1">
        <p className="text-caption font-medium text-text-secondary">
          {story.category} - {story.region}
        </p>
        <h3 className="mt-1 text-body-md font-semibold leading-snug text-text-primary">
          <Link
            href={`/news/${story.id}`}
            className="transition-opacity hover:opacity-80 focus-visible:underline focus-visible:outline-none"
          >
            {story.title}
          </Link>
        </h3>
        <p className="mt-1.5 text-caption text-text-secondary">
          {story.publishedLabel} | {story.readTime}
        </p>
      </div>
    </article>
  );
}

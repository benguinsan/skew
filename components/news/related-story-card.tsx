import Link from "next/link";
import type { RelatedStoryView } from "@/lib/articles/present";

type RelatedStoryCardProps = {
  story: RelatedStoryView;
};

export function RelatedStoryCard({ story }: RelatedStoryCardProps) {
  return (
    <article className="flex gap-3">
      <Link
        href={`/news/${story.id}`}
        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-bg-secondary"
        aria-hidden="true"
        tabIndex={-1}
      >
        {story.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- scraped/CDN hosts vary
          <img
            src={story.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
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

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookmarkIcon, MoreIcon, ShareIcon } from "@/components/icons";
import { NewsletterCta } from "@/components/layout/newsletter-cta";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { AiSummaryCard } from "@/components/news/ai-summary-card";
import { BiasAnalysisCard } from "@/components/news/bias-analysis-card";
import { RelatedStoryCard } from "@/components/news/related-story-card";
import { SourceBreakdownCard } from "@/components/news/source-breakdown-card";
import { BiasMeter } from "@/components/ui/bias-meter";
import { Container } from "@/components/ui/container";
import {
  toArticleDetailView,
  toRelatedStoryView,
} from "@/lib/articles/present";
import {
  getArticleDetailById,
  getRelatedAnalyzedArticles,
} from "@/lib/supabase/queries/articles";

export const dynamic = "force-dynamic";

type NewsDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: NewsDetailsPageProps): Promise<Metadata> {
  const { id } = await params;
  const detail = await getArticleDetailById(id);
  if (!detail) {
    return { title: "Article not found · biasly News" };
  }
  return {
    title: `${detail.article.title} · biasly News`,
    description: detail.analysis.summary,
  };
}

export default async function NewsDetailsPage({
  params,
}: NewsDetailsPageProps) {
  const { id } = await params;
  const detail = await getArticleDetailById(id);

  if (!detail) {
    notFound();
  }

  const article = toArticleDetailView(detail);
  const relatedCards = await getRelatedAnalyzedArticles(article.id);
  const related = relatedCards.map(toRelatedStoryView);
  const sourcesLabel =
    article.sourceCount === 1 ? "1 source" : `${article.sourceCount} sources`;

  return (
    <>
      <SiteHeader showTopics={false} activeNav={null} />

      <main className="flex-1 bg-bg-primary">
        <Container className="py-8 sm:py-10">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)] lg:gap-12">
            <div className="min-w-0">
              <p className="text-caption font-medium text-text-secondary">
                {article.category} - {article.region}
              </p>

              <h1 className="mt-3 text-[28px] font-bold leading-[1.2] text-text-primary sm:text-[36px] sm:leading-[1.15]">
                {article.title}
              </h1>

              <div className="mt-4 flex flex-col gap-3 border-b border-divider pb-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-body-sm text-text-secondary">
                  By {article.author} | {article.publishedLabel} |{" "}
                  {article.readTime}
                </p>

                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-body-sm text-text-secondary hover:bg-surface hover:text-text-primary"
                  >
                    <BookmarkIcon />
                    <span>Save</span>
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-body-sm text-text-secondary hover:bg-surface hover:text-text-primary"
                  >
                    <ShareIcon />
                    <span>Share</span>
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-surface hover:text-text-primary"
                    aria-label="More actions"
                  >
                    <MoreIcon />
                  </button>
                </div>
              </div>

              <div className="relative mt-6 aspect-2/1 overflow-hidden rounded-lg bg-bg-secondary">
                {/* eslint-disable-next-line @next/next/no-img-element -- scraped/CDN hosts vary */}
                <img
                  src={article.imageUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/15 to-transparent" />
              </div>
              <p className="mt-2 text-caption text-text-secondary">
                {article.imageCaption}
              </p>

              <div className="mt-6 space-y-2">
                <BiasMeter
                  variant="labeled"
                  left={article.leftPercentage}
                  center={article.centerPercentage}
                  right={article.rightPercentage}
                />
                <p className="text-caption text-text-secondary">
                  {sourcesLabel}
                </p>
              </div>

              <div className="mt-8 space-y-5 text-body-lg leading-[1.75] text-text-primary">
                {article.bodyParagraphs.map((paragraph) => (
                  <p key={paragraph.slice(0, 48)}>{paragraph}</p>
                ))}
              </div>

              {related.length > 0 ? (
                <section className="mt-12 border-t border-divider pt-8">
                  <h2 className="mb-6 text-h2 font-bold text-text-primary">
                    Related Stories
                  </h2>
                  <div className="grid gap-6 sm:grid-cols-2">
                    {related.map((story) => (
                      <RelatedStoryCard key={story.id} story={story} />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>

            <aside className="min-w-0 space-y-5 lg:sticky lg:top-6 lg:self-start">
              <BiasAnalysisCard article={article} />
              <AiSummaryCard analysis={article.analysis} />
              <SourceBreakdownCard
                sources={article.sources}
                totalSources={article.sourceCount}
                leftPercentage={article.leftPercentage}
                centerPercentage={article.centerPercentage}
                rightPercentage={article.rightPercentage}
              />
            </aside>
          </div>
        </Container>

        <NewsletterCta />
      </main>

      <SiteFooter />
    </>
  );
}

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ArticleCard } from "@/components/news/article-card";
import { Container } from "@/components/ui/container";
import { homeCardCategory, homeCardRegion } from "@/lib/articles/present";
import { getAnalyzedArticlesForHome } from "@/lib/supabase/queries/articles";

export const dynamic = "force-dynamic";

export default async function Home() {
  const articles = await getAnalyzedArticlesForHome();

  return (
    <>
      <SiteHeader />

      <main className="flex-1 bg-surface py-8 sm:py-10">
        <Container>
          <h1 className="mb-6 text-h2 font-bold leading-[1.3] text-text-primary sm:mb-8 sm:text-h1 sm:leading-[1.2]">
            Top News
          </h1>

          {articles.length === 0 ? (
            <p className="text-body-md text-text-secondary">
              No analyzed articles yet.
            </p>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-10">
              {articles.map((article) => (
                <ArticleCard
                  key={article.id}
                  title={article.title}
                  category={homeCardCategory()}
                  region={homeCardRegion(article)}
                  leftPercentage={article.leftPercentage}
                  centerPercentage={article.centerPercentage}
                  rightPercentage={article.rightPercentage}
                  sourceCount={1}
                  imageUrl={article.imageUrl}
                  href={`/news/${article.id}`}
                />
              ))}
            </div>
          )}
        </Container>
      </main>

      <SiteFooter />
    </>
  );
}

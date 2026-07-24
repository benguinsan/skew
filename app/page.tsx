import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ArticleCard } from "@/components/news/article-card";
import { Container } from "@/components/ui/container";
import { MOCK_TOP_NEWS } from "@/lib/mock-articles";

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main className="flex-1 bg-surface py-8 sm:py-10">
        <Container>
          <h1 className="mb-6 text-h2 font-bold leading-[1.3] text-text-primary sm:mb-8 sm:text-h1 sm:leading-[1.2]">
            Top News
          </h1>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-10">
            {MOCK_TOP_NEWS.map((article) => (
              <ArticleCard
                key={article.id}
                title={article.title}
                category={article.category}
                region={article.region}
                leftPercentage={article.leftPercentage}
                centerPercentage={article.centerPercentage}
                rightPercentage={article.rightPercentage}
                sourceCount={article.sourceCount}
                imageTone={article.imageTone}
                href={`/news/${article.id}`}
              />
            ))}
          </div>
        </Container>
      </main>

      <SiteFooter />
    </>
  );
}

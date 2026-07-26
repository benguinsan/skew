import type {
  ArticleDetail,
  BiasLabel,
  HomeArticleCard,
  SentimentLabel,
  SourceBiasLabel,
} from "@/lib/supabase/types";

export type { BiasLabel, SentimentLabel, SourceBiasLabel };

export type ArticleSourceItem = {
  name: string;
  biasLabel: SourceBiasLabel;
};

export type ArticleAnalysisView = {
  summaryBullets: string[];
  sentimentLabel: SentimentLabel;
  sentimentScore: number;
  biasLabel: BiasLabel;
  confidence: number;
  framingNotes: string;
  loadedTerms: string[];
  disclaimer: string;
  summaryReadTime: string;
  summaryDateLabel: string;
};

export type RelatedStoryView = {
  id: string;
  title: string;
  category: string;
  region: string;
  publishedLabel: string;
  readTime: string;
  imageUrl?: string;
};

export type ArticleDetailView = {
  id: string;
  title: string;
  category: string;
  region: string;
  leftPercentage: number;
  centerPercentage: number;
  rightPercentage: number;
  sourceCount: number;
  imageUrl: string;
  author: string;
  publishedLabel: string;
  readTime: string;
  imageCaption: string;
  bodyParagraphs: string[];
  analysis: ArticleAnalysisView;
  sources: ArticleSourceItem[];
};

export function formatBiasLabel(label: BiasLabel | SourceBiasLabel): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function biasTextClass(label: BiasLabel | SourceBiasLabel): string {
  if (label === "left") return "text-bias-left";
  if (label === "right") return "text-bias-right";
  if (label === "center") return "text-text-secondary";
  return "text-text-primary";
}

export function formatPublishedLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function estimateReadTime(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 220));
  return `${minutes} min read`;
}

export function splitIntoParagraphs(text: string): string[] {
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length > 1) {
    return blocks;
  }

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (sentences.length <= 2) {
    return [text.trim()].filter(Boolean);
  }

  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    paragraphs.push(sentences.slice(i, i + 2).join(" "));
  }
  return paragraphs;
}

export function summaryToBullets(summary: string): string[] {
  const sentences = summary
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (sentences.length === 0) {
    return [summary.trim()].filter(Boolean);
  }

  return sentences.slice(0, 4);
}

function toSourceBiasLabel(label: BiasLabel): SourceBiasLabel {
  if (label === "left" || label === "right" || label === "center") {
    return label;
  }
  return "center";
}

export function dominantPercentage(view: {
  leftPercentage: number;
  centerPercentage: number;
  rightPercentage: number;
  analysis: { biasLabel: BiasLabel };
}): number {
  const { leftPercentage, centerPercentage, rightPercentage, analysis } = view;
  if (analysis.biasLabel === "left") return leftPercentage;
  if (analysis.biasLabel === "right") return rightPercentage;
  if (analysis.biasLabel === "center") return centerPercentage;
  return Math.max(leftPercentage, centerPercentage, rightPercentage);
}

export function homeCardCategory(): string {
  return "News";
}

export function homeCardRegion(card: HomeArticleCard): string {
  return card.sourceName;
}

export function toArticleDetailView(detail: ArticleDetail): ArticleDetailView {
  const { article, source, analysis } = detail;
  const readTime = estimateReadTime(article.raw_text);

  return {
    id: article.id,
    title: article.title,
    category: "News",
    region: source.name,
    leftPercentage: analysis.left_percentage,
    centerPercentage: analysis.center_percentage,
    rightPercentage: analysis.right_percentage,
    sourceCount: 1,
    imageUrl: article.image_url,
    author: source.name,
    publishedLabel: formatPublishedLabel(article.published_at),
    readTime,
    imageCaption: `${source.name} coverage. Photo: article image`,
    bodyParagraphs: splitIntoParagraphs(article.raw_text),
    analysis: {
      summaryBullets: summaryToBullets(analysis.summary),
      sentimentLabel: analysis.sentiment_label,
      sentimentScore: Number(analysis.sentiment_score),
      biasLabel: analysis.bias_label,
      confidence: Number(analysis.confidence),
      framingNotes: analysis.framing_notes,
      loadedTerms: analysis.loaded_terms,
      disclaimer: analysis.disclaimer,
      summaryReadTime: estimateReadTime(analysis.summary),
      summaryDateLabel: formatPublishedLabel(article.published_at),
    },
    sources: [
      {
        name: source.name,
        biasLabel: toSourceBiasLabel(analysis.bias_label),
      },
    ],
  };
}

export function toRelatedStoryView(card: HomeArticleCard): RelatedStoryView {
  return {
    id: card.id,
    title: card.title,
    category: homeCardCategory(),
    region: homeCardRegion(card),
    publishedLabel: formatPublishedLabel(card.publishedAt),
    readTime: "5 min read",
    imageUrl: card.imageUrl,
  };
}

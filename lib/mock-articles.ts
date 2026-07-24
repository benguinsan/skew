import type { ArticleCardProps } from "@/components/news/article-card";

export type MockArticle = Omit<ArticleCardProps, "className" | "href"> & {
  id: string;
};

export type BiasFramingLabel =
  "left" | "center" | "right" | "mixed" | "unclear";
export type SentimentLabel = "positive" | "neutral" | "negative";
export type SourceBiasLabel = "left" | "center" | "right";

export type MockSource = {
  name: string;
  biasLabel: SourceBiasLabel;
};

export type MockArticleAnalysis = {
  summaryBullets: string[];
  sentimentLabel: SentimentLabel;
  sentimentScore: number;
  biasLabel: BiasFramingLabel;
  confidence: number;
  framingNotes: string;
  loadedTerms: string[];
  disclaimer: string;
  summaryReadTime: string;
  summaryDateLabel: string;
};

export type MockRelatedStory = {
  id: string;
  title: string;
  category: string;
  region: string;
  publishedLabel: string;
  readTime: string;
  imageTone?: string;
};

export type MockArticleDetail = MockArticle & {
  author: string;
  publishedLabel: string;
  readTime: string;
  imageCaption: string;
  bodyParagraphs: string[];
  relatedIds: string[];
  analysis: MockArticleAnalysis;
  sources: MockSource[];
};

export const TOPIC_CHIPS = [
  "World Cup",
  "IPL",
  "Social Media",
  "Business & Markets",
  "Artificial Intelligence",
  "Climate",
  "Elections",
  "Health",
  "Science",
  "Technology",
] as const;

/** Static Top News stories shaped like future articles + analyses. */
export const MOCK_TOP_NEWS: MockArticle[] = [
  {
    id: "1",
    title: "Trump Sends Iran Revised Peace Proposal With Tougher Terms: Report",
    category: "Politics",
    region: "United States",
    leftPercentage: 20,
    centerPercentage: 31,
    rightPercentage: 49,
    sourceCount: 12,
    imageTone: "bg-[#d7dde6]",
  },
  {
    id: "2",
    title:
      "Researchers Make Case for Grapes as a 'Superfood' After Review of Health Evidence",
    category: "Health",
    region: "United States",
    leftPercentage: 18,
    centerPercentage: 42,
    rightPercentage: 40,
    sourceCount: 7,
    imageTone: "bg-[#e8ddd4]",
  },
  {
    id: "3",
    title: "CERN Finds High-Significance Hint of Physics Beyond Standard Model",
    category: "Science",
    region: "Switzerland",
    leftPercentage: 16,
    centerPercentage: 62,
    rightPercentage: 22,
    sourceCount: 8,
    imageTone: "bg-[#d9e2ef]",
  },
  {
    id: "4",
    title:
      "Gulf States Expand Diplomatic Outreach as Regional Ceasefire Talks Resume",
    category: "World",
    region: "Middle East",
    leftPercentage: 28,
    centerPercentage: 44,
    rightPercentage: 28,
    sourceCount: 15,
    imageTone: "bg-[#e5e0d6]",
  },
  {
    id: "5",
    title: "Central Banks Signal Cautious Path as Inflation Cool-Down Slows",
    category: "Business",
    region: "Global",
    leftPercentage: 22,
    centerPercentage: 38,
    rightPercentage: 40,
    sourceCount: 11,
    imageTone: "bg-[#dde8e2]",
  },
  {
    id: "6",
    title: "Tech Firms Face New Scrutiny Over AI Training Data Transparency",
    category: "Technology",
    region: "United States",
    leftPercentage: 41,
    centerPercentage: 34,
    rightPercentage: 25,
    sourceCount: 9,
    imageTone: "bg-[#e2ddea]",
  },
  {
    id: "7",
    title: "Wildfire Season Forecast Warns of Above-Average Risk Across West",
    category: "Climate",
    region: "United States",
    leftPercentage: 48,
    centerPercentage: 32,
    rightPercentage: 20,
    sourceCount: 10,
    imageTone: "bg-[#ead9d2]",
  },
  {
    id: "8",
    title: "European Leaders Debate Defense Spending Targets Ahead of Summit",
    category: "World",
    region: "Europe",
    leftPercentage: 30,
    centerPercentage: 40,
    rightPercentage: 30,
    sourceCount: 14,
    imageTone: "bg-[#d6e0ea]",
  },
  {
    id: "9",
    title:
      "Court Ruling Leaves Both Sides Claiming Partial Victory on Voting Rules",
    category: "Law",
    region: "United States",
    leftPercentage: 40,
    centerPercentage: 20,
    rightPercentage: 40,
    sourceCount: 13,
    imageTone: "bg-[#e6e2d8]",
  },
  {
    id: "10",
    title:
      "Streaming Platforms Race to Lock Up Live Sports Rights for Next Decade",
    category: "Media",
    region: "United States",
    leftPercentage: 25,
    centerPercentage: 45,
    rightPercentage: 30,
    sourceCount: 6,
    imageTone: "bg-[#dce6ef]",
  },
  {
    id: "11",
    title:
      "New Study Links Urban Heat Islands to Rising Summer Hospital Visits",
    category: "Health",
    region: "Global",
    leftPercentage: 36,
    centerPercentage: 48,
    rightPercentage: 16,
    sourceCount: 8,
    imageTone: "bg-[#e4ddd6]",
  },
  {
    id: "12",
    title:
      "Space Agency Confirms Successful Docking of Supply Mission to Station",
    category: "Science",
    region: "International",
    leftPercentage: 14,
    centerPercentage: 68,
    rightPercentage: 18,
    sourceCount: 5,
    imageTone: "bg-[#d5dbe8]",
  },
];

const DEFAULT_DISCLAIMER =
  "AI summaries can make mistakes. Check important information against the original reporting.";

const DEFAULT_SOURCES: MockSource[] = [
  { name: "Fox News", biasLabel: "right" },
  { name: "Reuters", biasLabel: "center" },
  { name: "Associated Press", biasLabel: "center" },
  { name: "CNN", biasLabel: "left" },
  { name: "The Washington Post", biasLabel: "left" },
  { name: "The Wall Street Journal", biasLabel: "right" },
  { name: "BBC News", biasLabel: "center" },
  { name: "NBC News", biasLabel: "left" },
  { name: "New York Post", biasLabel: "right" },
  { name: "USA Today", biasLabel: "center" },
  { name: "The Hill", biasLabel: "center" },
  { name: "Breitbart", biasLabel: "right" },
];

function dominantBiasLabel(
  left: number,
  center: number,
  right: number,
): BiasFramingLabel {
  const max = Math.max(left, center, right);
  const ties = [left === max, center === max, right === max].filter(
    Boolean,
  ).length;
  if (ties > 1) {
    return "mixed";
  }
  if (right === max) return "right";
  if (left === max) return "left";
  return "center";
}

function capitalize(label: string) {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const ARTICLE_DETAILS: Record<
  string,
  Omit<MockArticleDetail, keyof MockArticle> & { id: string }
> = {
  "1": {
    id: "1",
    author: "David Morgan",
    publishedLabel: "May 31, 2026",
    readTime: "12 min read",
    imageCaption:
      "President Trump reviews documents in the Oval Office. Photo credit: Biasly Archive",
    bodyParagraphs: [
      "Washington — President Donald Trump has sent Iran a revised peace proposal that hardens several conditions from an earlier draft, according to people familiar with the talks, raising the stakes for negotiators already wrestling with verification, sanctions relief, and regional security guarantees.",
      "The updated outline reportedly tightens language on enrichment limits, expands inspection access for international monitors, and links phased sanctions relief to clearer benchmarks. Supporters argue the revisions close loopholes that previously left room for ambiguity; critics say the tougher terms could stall momentum just as shuttle diplomacy was beginning to show progress.",
      '"This is a more exacting framework," one official briefed on the document said. "It asks Iran to accept constraints earlier and with less discretion than the first proposal contemplated."',
      "Iranian officials have not publicly confirmed receipt of the revised text. Analysts watching the talks note that any durable agreement will still need buy-in from regional partners and a workable plan for monitoring compliance over years, not weeks.",
      "Coverage across major outlets diverged quickly on whether the revision represents tough-minded statecraft or an unnecessary escalation. Biasly’s AI framing estimate reflects that split in emphasis, wording, and sourcing — not a judgment of which interpretation is correct.",
    ],
    relatedIds: ["4", "8", "5", "9", "6", "3"],
    analysis: {
      summaryBullets: [
        "Trump administration circulated a revised Iran peace proposal with stricter verification and enrichment terms.",
        "Officials say sanctions relief would be more tightly sequenced against compliance milestones.",
        "Iran has not publicly confirmed the new draft; regional partners remain key to any lasting deal.",
        "U.S. and international coverage differs on whether the tougher terms help or hinder negotiations.",
      ],
      sentimentLabel: "neutral",
      sentimentScore: -0.12,
      biasLabel: "right",
      confidence: 0.74,
      framingNotes:
        "AI-estimated framing based on article wording, emphasis, and cited actors. Stronger right-leaning coverage stress leverage and tougher terms; left-leaning pieces emphasize escalation risk and diplomatic fragility. This is an estimate, not objective truth.",
      loadedTerms: ["tougher terms", "leverage", "escalation", "compliance"],
      disclaimer: DEFAULT_DISCLAIMER,
      summaryReadTime: "3 min read",
      summaryDateLabel: "May 31, 2026",
    },
    sources: DEFAULT_SOURCES,
  },
};

function buildGenericDetail(article: MockArticle): MockArticleDetail {
  const biasLabel = dominantBiasLabel(
    article.leftPercentage,
    article.centerPercentage,
    article.rightPercentage,
  );
  const relatedIds = MOCK_TOP_NEWS.filter((item) => item.id !== article.id)
    .slice(0, 6)
    .map((item) => item.id);

  return {
    ...article,
    author: "Biasly Desk",
    publishedLabel: "June 1, 2026",
    readTime: "8 min read",
    imageCaption: `${article.category} coverage placeholder. Photo credit: Biasly Archive`,
    bodyParagraphs: [
      `${article.title} — reporting across ${article.sourceCount} outlets shows competing emphasis on what the story means and which details matter most.`,
      `Coverage in the ${article.category.toLowerCase()} beat has focused on near-term consequences for ${article.region}, while secondary threads explore longer-term implications and unanswered questions.`,
      "Biasly stores a single primary article per URL in production; the multi-source panel on this page is mock UI that mirrors the product design while analysis fields remain shaped like future article_analyses rows.",
      "Readers should treat framing percentages as AI-estimated signals derived from the article text, not as a definitive score of outlet ideology.",
    ],
    relatedIds,
    analysis: {
      summaryBullets: [
        `Key developments in “${article.title}” are being framed differently across outlets.`,
        `Primary geographic focus: ${article.region}.`,
        `AI-estimated framing leans ${biasLabel} based on wording and emphasis in the saved article text.`,
        "Confidence and loaded terms are included so readers can judge how strong the signal is.",
      ],
      sentimentLabel: "neutral",
      sentimentScore: 0,
      biasLabel,
      confidence: 0.62,
      framingNotes: `AI-estimated political framing for this ${article.category.toLowerCase()} story. Percentages reflect emphasis in the article text, not a claim about the publisher’s identity.`,
      loadedTerms: ["report", "officials", "framework", "impact"],
      disclaimer: DEFAULT_DISCLAIMER,
      summaryReadTime: "2 min read",
      summaryDateLabel: "June 1, 2026",
    },
    sources: DEFAULT_SOURCES.slice(
      0,
      Math.min(article.sourceCount, DEFAULT_SOURCES.length),
    ),
  };
}

export function getMockArticleDetail(id: string): MockArticleDetail | null {
  const listItem = MOCK_TOP_NEWS.find((article) => article.id === id);
  if (!listItem) {
    return null;
  }

  const override = ARTICLE_DETAILS[id];
  if (override) {
    return {
      ...listItem,
      ...override,
    };
  }

  return buildGenericDetail(listItem);
}

export function getRelatedStories(
  detail: MockArticleDetail,
): MockRelatedStory[] {
  const stories: MockRelatedStory[] = [];

  for (const relatedId of detail.relatedIds) {
    const article = MOCK_TOP_NEWS.find((item) => item.id === relatedId);
    if (!article) {
      continue;
    }
    stories.push({
      id: article.id,
      title: article.title,
      category: article.category,
      region: article.region,
      publishedLabel: "May 30, 2026",
      readTime: "6 min read",
      imageTone: article.imageTone,
    });
  }

  return stories;
}

export function formatBiasLabel(label: BiasFramingLabel | SourceBiasLabel) {
  return capitalize(label);
}

export function biasTextClass(label: BiasFramingLabel | SourceBiasLabel) {
  if (label === "left") return "text-bias-left";
  if (label === "right") return "text-bias-right";
  if (label === "center") return "text-text-secondary";
  return "text-text-primary";
}

export function dominantPercentage(detail: MockArticleDetail) {
  const { leftPercentage, centerPercentage, rightPercentage, analysis } =
    detail;
  if (analysis.biasLabel === "left") return leftPercentage;
  if (analysis.biasLabel === "right") return rightPercentage;
  if (analysis.biasLabel === "center") return centerPercentage;
  return Math.max(leftPercentage, centerPercentage, rightPercentage);
}

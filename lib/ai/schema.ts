import { z } from "zod";
import type { TablesInsert } from "@/lib/supabase/types";

export const articleAnalysisOutputSchema = z
  .object({
    summary: z
      .string()
      .min(1)
      .describe("Neutral summary of the article; no opinionated framing."),
    sentimentScore: z
      .number()
      .min(-1)
      .max(1)
      .describe("Overall sentiment from -1 (negative) to 1 (positive)."),
    sentimentLabel: z.enum(["positive", "neutral", "negative"]),
    politicalFramingLabel: z
      .enum(["left", "center", "right", "mixed", "unclear"])
      .describe(
        "AI-estimated political framing. Use unclear when evidence is weak.",
      ),
    leftPercentage: z.number().int().min(0).max(100),
    centerPercentage: z.number().int().min(0).max(100),
    rightPercentage: z.number().int().min(0).max(100),
    confidence: z
      .number()
      .min(0)
      .max(1)
      .describe("Confidence in the framing estimate from 0 to 1."),
    framingNotes: z
      .string()
      .min(1)
      .describe("Brief notes on how the article frames the subject."),
    loadedTerms: z
      .array(z.string())
      .describe("Loaded or emotionally charged terms found in the article."),
    disclaimer: z
      .string()
      .min(1)
      .describe(
        "Short disclaimer that framing is AI-estimated, not objective truth.",
      ),
  })
  .refine(
    (value) =>
      value.leftPercentage + value.centerPercentage + value.rightPercentage ===
      100,
    {
      message:
        "leftPercentage + centerPercentage + rightPercentage must equal 100",
    },
  );

export type ArticleAnalysisOutput = z.infer<typeof articleAnalysisOutputSchema>;

export function mapAnalysisOutputToInsert(
  articleId: string,
  output: ArticleAnalysisOutput,
  model: string,
): TablesInsert<"article_analyses"> {
  const biasScore = (output.rightPercentage - output.leftPercentage) / 100;

  return {
    article_id: articleId,
    summary: output.summary.trim(),
    sentiment_score: output.sentimentScore,
    sentiment_label: output.sentimentLabel,
    bias_score: biasScore,
    bias_label: output.politicalFramingLabel,
    left_percentage: output.leftPercentage,
    center_percentage: output.centerPercentage,
    right_percentage: output.rightPercentage,
    confidence: output.confidence,
    framing_notes: output.framingNotes.trim(),
    loaded_terms: output.loadedTerms.map((t) => t.trim()).filter(Boolean),
    disclaimer: output.disclaimer.trim(),
    model,
  };
}

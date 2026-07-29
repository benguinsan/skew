export type ScrapeRunStatus = "completed" | "failed";

export type ScrapeRunError = {
  source?: string;
  message: string;
};

export type ScrapeRunSummary = {
  status: ScrapeRunStatus;
  sourcesChecked: number;
  candidatesFound: number;
  candidatesRejected: number;
  duplicatesSkipped: number;
  detailPagesScraped: number;
  articlesInserted: number;
  articlesRejected: number;
  articlesFailed: number;
  totalDurationMs: number;
  rejectionReasons: Record<string, number>;
  errors?: ScrapeRunError[];
};

export type ScrapePipelineOptions = {
  sourceIds?: string[];
  sourceNames?: string[];
  /** Max successful inserts per source (default 5, max 20). */
  perSourceLimit?: number;
};

export const DEFAULT_PER_SOURCE_LIMIT = 5;
export const MAX_PER_SOURCE_LIMIT = 20;

export type AnalyzeRunStatus = "completed" | "failed";

export type AnalyzeRunError = {
  articleId?: string;
  message: string;
};

export type AnalyzeRunSummary = {
  status: AnalyzeRunStatus;
  pendingFound: number;
  analyzed: number;
  skipped: number;
  failed: number;
  batches: number;
  model: string;
  totalDurationMs: number;
  errors?: AnalyzeRunError[];
};

export type AnalyzePipelineOptions = {
  articleIds?: string[];
  /** Max articles to analyze this run (optional; omit = all pending). */
  limit?: number;
  /** Override ANALYSIS_BATCH_SIZE for this run. */
  batchSize?: number;
};

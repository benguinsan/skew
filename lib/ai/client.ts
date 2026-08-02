import "server-only";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  getOpenRouterAnalysisModel,
  getOpenRouterApiKey,
  getOpenRouterEmbeddingModel,
} from "@/lib/ai/env";

let provider: ReturnType<typeof createOpenRouter> | null = null;

function getOpenRouterProvider() {
  if (!provider) {
    provider = createOpenRouter({
      apiKey: getOpenRouterApiKey(),
      appName: "biasly",
      appUrl: "https://biasly.local",
    });
  }
  return provider;
}

/** Chat model for structured article analysis, with response-healing for JSON. */
export function getAnalysisModel() {
  const modelId = getOpenRouterAnalysisModel();
  return getOpenRouterProvider()(modelId, {
    plugins: [{ id: "response-healing" }],
  });
}

export function getAnalysisModelId(): string {
  return getOpenRouterAnalysisModel();
}

/** Embedding model for article_analyses.embedding (1536 dims by default). */
export function getEmbeddingModel() {
  return getOpenRouterProvider().textEmbeddingModel(
    getOpenRouterEmbeddingModel(),
  );
}

export function getEmbeddingModelId(): string {
  return getOpenRouterEmbeddingModel();
}

import type { LLMProvider, EmbeddingProvider } from "./types";
import { OpenAILLMProvider, OpenAIEmbeddingProvider } from "./openai-provider";
import { OllamaLLMProvider, OllamaEmbeddingProvider } from "./ollama-provider";

let llmInstance: LLMProvider | null = null;
let embeddingInstance: EmbeddingProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (llmInstance) return llmInstance;

  const provider = process.env.LLM_PROVIDER || "openai";

  switch (provider) {
    case "ollama":
      llmInstance = new OllamaLLMProvider();
      break;
    case "openai":
    default:
      llmInstance = new OpenAILLMProvider();
      break;
  }

  return llmInstance;
}

export function getEmbeddingProvider(): EmbeddingProvider {
  if (embeddingInstance) return embeddingInstance;

  const provider = process.env.LLM_PROVIDER || "openai";

  switch (provider) {
    case "ollama":
      embeddingInstance = new OllamaEmbeddingProvider();
      break;
    case "openai":
    default:
      embeddingInstance = new OpenAIEmbeddingProvider();
      break;
  }

  return embeddingInstance;
}

export type { LLMProvider, EmbeddingProvider };

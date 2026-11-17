import type { SearchResult } from "./vector-search";

// Rough estimate: 1 token ≈ 4 characters for code
const CHARS_PER_TOKEN = 4;

export interface ContextConfig {
  maxContextTokens?: number;
  maxHistoryMessages?: number;
  maxResponseTokens?: number;
}

const DEFAULT_CONFIG: Required<ContextConfig> = {
  maxContextTokens: 4000,
  maxHistoryMessages: 20,
  maxResponseTokens: 2048,
};

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Formats search results into a context string, truncating if needed
 * to stay within token limits. Chunks are added in order of relevance
 * (most relevant first) until the token budget is exhausted.
 */
export function buildContext(
  results: SearchResult[],
  config: ContextConfig = {}
): { context: string; usedChunks: number; estimatedTokens: number } {
  const { maxContextTokens } = { ...DEFAULT_CONFIG, ...config };

  let totalTokens = 0;
  const includedChunks: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const formatted = `--- Source ${i + 1}: ${result.filePath} (lines ${result.startLine}-${result.endLine}) ---\n${result.content}`;
    const chunkTokens = estimateTokens(formatted);

    if (totalTokens + chunkTokens > maxContextTokens && includedChunks.length > 0) {
      break;
    }

    includedChunks.push(formatted);
    totalTokens += chunkTokens;
  }

  return {
    context: includedChunks.join("\n\n"),
    usedChunks: includedChunks.length,
    estimatedTokens: totalTokens,
  };
}

/**
 * Trims conversation history to fit within limits.
 * Keeps the most recent messages, drops older ones first.
 */
export function trimHistory(
  messages: { role: string; content: string }[],
  config: ContextConfig = {}
): { role: string; content: string }[] {
  const { maxHistoryMessages } = { ...DEFAULT_CONFIG, ...config };

  if (messages.length <= maxHistoryMessages) {
    return messages;
  }

  return messages.slice(-maxHistoryMessages);
}

export { DEFAULT_CONFIG };

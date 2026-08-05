import { prisma } from "@/lib/db/prisma";
import { getEmbeddingProvider } from "@/lib/llm";

export interface SearchResult {
  id: string;
  filePath: string;
  content: string;
  startLine: number;
  endLine: number;
  language: string | null;
  similarity: number;
}

export async function searchCodeChunks(
  repositoryId: string,
  query: string,
  topK: number = 10
): Promise<SearchResult[]> {
  const embeddingProvider = getEmbeddingProvider();
  const queryEmbedding = await embeddingProvider.embed(query);
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  const results = await prisma.$queryRawUnsafe<SearchResult[]>(
    `SELECT
       id,
       "filePath" as "filePath",
       content,
       "startLine" as "startLine",
       "endLine" as "endLine",
       language,
       1 - (embedding <=> $1::vector) as similarity
     FROM "CodeChunk"
     WHERE "repositoryId" = $2
       AND embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    embeddingStr,
    repositoryId,
    topK
  );

  return results;
}

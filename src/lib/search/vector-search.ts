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

export interface SearchOptions {
  topK?: number;
  minSimilarity?: number;
  language?: string;
  filePath?: string;
}

export async function searchCodeChunks(
  repositoryId: string,
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const { topK = 10, minSimilarity = 0.0, language, filePath } = options;

  const embeddingProvider = getEmbeddingProvider();
  const queryEmbedding = await embeddingProvider.embed(query);
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  // Build WHERE clause with optional metadata filters
  const conditions: string[] = [
    `"repositoryId" = $2`,
    `embedding IS NOT NULL`,
  ];
  const params: (string | number)[] = [embeddingStr, repositoryId];
  let paramIndex = 3;

  if (language) {
    conditions.push(`language = $${paramIndex}`);
    params.push(language);
    paramIndex++;
  }

  if (filePath) {
    conditions.push(`"filePath" LIKE $${paramIndex}`);
    params.push(`%${filePath}%`);
    paramIndex++;
  }

  const whereClause = conditions.join(" AND ");

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
     WHERE ${whereClause}
     ORDER BY embedding <=> $1::vector
     LIMIT $${paramIndex}`,
    ...params,
    topK
  );

  // Filter by minimum similarity threshold
  if (minSimilarity > 0) {
    return results.filter((r) => r.similarity >= minSimilarity);
  }

  return results;
}

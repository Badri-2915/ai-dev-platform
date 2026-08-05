import { simpleGit } from "simple-git";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { prisma } from "@/lib/db/prisma";
import { getEmbeddingProvider } from "@/lib/llm";
import { shouldProcessFile, chunkFileContent, type CodeChunkData } from "./chunker";

function getAllFiles(dir: string, baseDir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath, baseDir));
    } else if (entry.isFile() && shouldProcessFile(relativePath)) {
      files.push(fullPath);
    }
  }

  return files;
}

export async function ingestRepository(repositoryId: string, accessToken?: string) {
  const repo = await prisma.repository.findUnique({ where: { id: repositoryId } });
  if (!repo) throw new Error(`Repository ${repositoryId} not found`);

  const tmpDir = path.join(os.tmpdir(), `ai-dev-platform-${repositoryId}`);

  try {
    // Update status to cloning
    await prisma.repository.update({
      where: { id: repositoryId },
      data: { status: "cloning" },
    });

    // Clone the repository
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }

    const git = simpleGit();
    let cloneUrl = repo.url;

    // If private repo and we have an access token, use it
    if (accessToken && repo.isPrivate) {
      const url = new URL(cloneUrl);
      url.username = "oauth2";
      url.password = accessToken;
      cloneUrl = url.toString();
    }

    await git.clone(cloneUrl, tmpDir, ["--depth", "1", "--branch", repo.branch]);

    // Update status to indexing
    await prisma.repository.update({
      where: { id: repositoryId },
      data: { status: "indexing" },
    });

    // Get all processable files
    const files = getAllFiles(tmpDir, tmpDir);

    // Chunk all files
    const allChunks: CodeChunkData[] = [];
    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const relativePath = path.relative(tmpDir, filePath);
        const chunks = chunkFileContent(relativePath, content);
        allChunks.push(...chunks);
      } catch {
        // Skip files that can't be read
      }
    }

    // Delete existing chunks for this repo
    await prisma.codeChunk.deleteMany({ where: { repositoryId } });

    // Generate embeddings in batches
    const embeddingProvider = getEmbeddingProvider();
    const batchSize = 50;

    for (let i = 0; i < allChunks.length; i += batchSize) {
      const batch = allChunks.slice(i, i + batchSize);
      const textsToEmbed = batch.map(
        (chunk) => `File: ${chunk.filePath}\n\n${chunk.content}`
      );

      const embeddings = await embeddingProvider.embedBatch(textsToEmbed);

      // Insert chunks with embeddings using raw SQL (Prisma doesn't support vector type directly)
      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j];
        const embedding = embeddings[j];
        const embeddingStr = `[${embedding.join(",")}]`;

        await prisma.$executeRawUnsafe(
          `INSERT INTO "CodeChunk" (id, "filePath", content, "startLine", "endLine", language, embedding, "repositoryId", "createdAt")
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6::vector, $7, NOW())`,
          chunk.filePath,
          chunk.content,
          chunk.startLine,
          chunk.endLine,
          chunk.language,
          embeddingStr,
          repositoryId
        );
      }
    }

    // Update repository status
    await prisma.repository.update({
      where: { id: repositoryId },
      data: {
        status: "ready",
        fileCount: files.length,
        chunkCount: allChunks.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await prisma.repository.update({
      where: { id: repositoryId },
      data: { status: "error", errorMessage: message },
    });
    throw error;
  } finally {
    // Clean up temp directory
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
}

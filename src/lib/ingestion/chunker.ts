const SUPPORTED_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".py", ".java", ".go", ".rs", ".rb",
  ".cpp", ".c", ".h", ".hpp", ".cs", ".swift", ".kt", ".scala",
  ".php", ".vue", ".svelte", ".html", ".css", ".scss",
  ".json", ".yaml", ".yml", ".toml", ".md", ".mdx", ".txt",
  ".sql", ".sh", ".bash", ".zsh", ".dockerfile",
]);

const IGNORED_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", "out",
  "__pycache__", ".venv", "venv", "vendor", ".idea", ".vscode",
  "target", "bin", "obj", ".cache", "coverage",
]);

const MAX_FILE_SIZE = 100 * 1024; // 100KB

export interface CodeChunkData {
  filePath: string;
  content: string;
  startLine: number;
  endLine: number;
  language: string | null;
}

export function shouldProcessFile(filePath: string): boolean {
  const parts = filePath.split("/");
  for (const part of parts) {
    if (IGNORED_DIRS.has(part)) return false;
  }

  const ext = filePath.substring(filePath.lastIndexOf(".")).toLowerCase();
  return SUPPORTED_EXTENSIONS.has(ext);
}

export function getLanguageFromPath(filePath: string): string | null {
  const ext = filePath.substring(filePath.lastIndexOf(".")).toLowerCase();
  const langMap: Record<string, string> = {
    ".ts": "typescript", ".tsx": "typescript", ".js": "javascript", ".jsx": "javascript",
    ".py": "python", ".java": "java", ".go": "go", ".rs": "rust", ".rb": "ruby",
    ".cpp": "cpp", ".c": "c", ".h": "c", ".hpp": "cpp", ".cs": "csharp",
    ".swift": "swift", ".kt": "kotlin", ".scala": "scala", ".php": "php",
    ".vue": "vue", ".svelte": "svelte", ".html": "html", ".css": "css", ".scss": "scss",
    ".json": "json", ".yaml": "yaml", ".yml": "yaml", ".toml": "toml",
    ".md": "markdown", ".mdx": "markdown", ".sql": "sql",
    ".sh": "bash", ".bash": "bash", ".zsh": "zsh",
    ".dockerfile": "dockerfile",
  };
  return langMap[ext] || null;
}

export function chunkFileContent(
  filePath: string,
  content: string,
  maxChunkLines: number = 60,
  overlapLines: number = 10
): CodeChunkData[] {
  if (content.length > MAX_FILE_SIZE) return [];

  const language = getLanguageFromPath(filePath);
  const lines = content.split("\n");

  if (lines.length <= maxChunkLines) {
    return [{
      filePath,
      content: content.trim(),
      startLine: 1,
      endLine: lines.length,
      language,
    }];
  }

  const chunks: CodeChunkData[] = [];
  let start = 0;

  while (start < lines.length) {
    const end = Math.min(start + maxChunkLines, lines.length);
    const chunkContent = lines.slice(start, end).join("\n").trim();

    if (chunkContent.length > 0) {
      chunks.push({
        filePath,
        content: chunkContent,
        startLine: start + 1,
        endLine: end,
        language,
      });
    }

    if (end >= lines.length) break;
    start = end - overlapLines;
  }

  return chunks;
}

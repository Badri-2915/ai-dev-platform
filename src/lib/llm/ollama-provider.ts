import type { LLMProvider, EmbeddingProvider } from "./types";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

export class OllamaLLMProvider implements LLMProvider {
  private model: string;

  constructor() {
    this.model = process.env.OLLAMA_MODEL || "llama3";
  }

  async chat(params: {
    messages: { role: "system" | "user" | "assistant"; content: string }[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<string> {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages: params.messages,
        stream: false,
        options: {
          temperature: params.temperature ?? 0.3,
          num_predict: params.maxTokens ?? 2048,
        },
      }),
    });

    const data = await response.json();
    return data.message?.content ?? "";
  }

  async chatStream(params: {
    messages: { role: "system" | "user" | "assistant"; content: string }[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<ReadableStream<string>> {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages: params.messages,
        stream: true,
        options: {
          temperature: params.temperature ?? 0.3,
          num_predict: params.maxTokens ?? 2048,
        },
      }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    return new ReadableStream<string>({
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.message?.content) {
              controller.enqueue(parsed.message.content);
            }
            if (parsed.done) {
              controller.close();
              return;
            }
          } catch {
            // skip malformed lines
          }
        }
      },
    });
  }
}

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  private model: string;
  dimensions: number;

  constructor() {
    this.model = process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text";
    this.dimensions = parseInt(process.env.EMBEDDING_DIMENSIONS || "768", 10);
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt: text,
      }),
    });

    const data = await response.json();
    return data.embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (const text of texts) {
      embeddings.push(await this.embed(text));
    }
    return embeddings;
  }
}

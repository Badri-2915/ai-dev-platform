export interface LLMProvider {
  chat(params: {
    messages: { role: "system" | "user" | "assistant"; content: string }[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<string>;

  chatStream(params: {
    messages: { role: "system" | "user" | "assistant"; content: string }[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<ReadableStream<string>>;
}

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  dimensions: number;
}

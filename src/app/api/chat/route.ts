import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { searchCodeChunks } from "@/lib/search/vector-search";
import { buildContext, trimHistory } from "@/lib/search/context-manager";
import { getLLMProvider } from "@/lib/llm";

const SYSTEM_PROMPT = `You are an expert code assistant. You answer questions about a codebase based on the source code provided to you as context.

Rules:
1. ONLY use the provided code context to answer questions. Do not make up code that doesn't exist.
2. When referencing code, always mention the file path and line numbers.
3. If the context doesn't contain enough information to answer, say so clearly.
4. Format your responses using Markdown with code blocks for code snippets.
5. Be concise but thorough.`;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { message, conversationId, repositoryId } = await req.json();

  if (!message || !repositoryId) {
    return new Response(
      JSON.stringify({ error: "message and repositoryId are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Verify repo belongs to user
  const repo = await prisma.repository.findFirst({
    where: { id: repositoryId, userId: session.user.id },
  });

  if (!repo) {
    return new Response(JSON.stringify({ error: "Repository not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Search for relevant code chunks
  const searchResults = await searchCodeChunks(repositoryId, message, { topK: 10 });

  // Build context from search results (token-aware truncation)
  const { context: codeContext } = buildContext(searchResults);

  // Get or create conversation
  let convId = conversationId;
  if (!convId) {
    const conversation = await prisma.conversation.create({
      data: {
        title: message.substring(0, 100),
        userId: session.user.id,
        repositoryId,
      },
    });
    convId = conversation.id;
  }

  // Save user message
  await prisma.message.create({
    data: {
      role: "user",
      content: message,
      conversationId: convId,
    },
  });

  // Get conversation history
  const history = await prisma.message.findMany({
    where: { conversationId: convId },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  // Trim history if it exceeds limits
  const trimmedHistory = trimHistory(
    history.map((msg) => ({ role: msg.role, content: msg.content }))
  );

  // Build messages for LLM
  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Here is the relevant source code context:\n\n${codeContext}`,
    },
  ];

  // Add conversation history (skip the context message)
  for (const msg of trimmedHistory) {
    messages.push({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    });
  }

  // Stream LLM response
  const llm = getLLMProvider();
  const stream = await llm.chatStream({ messages });

  // Create a transform stream that collects the full response
  let fullResponse = "";
  const sources = JSON.stringify(
    searchResults.map((r) => ({
      filePath: r.filePath,
      startLine: r.startLine,
      endLine: r.endLine,
      similarity: r.similarity,
    }))
  );

  const encoder = new TextEncoder();
  const transformStream = new ReadableStream({
    async start(controller) {
      const reader = stream.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullResponse += value;

          // Send as SSE
          const data = JSON.stringify({ content: value, conversationId: convId });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }

        // Save assistant message
        await prisma.message.create({
          data: {
            role: "assistant",
            content: fullResponse,
            sources,
            conversationId: convId,
          },
        });

        // Send done event
        const doneData = JSON.stringify({
          done: true,
          conversationId: convId,
          sources: JSON.parse(sources),
        });
        controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(transformStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

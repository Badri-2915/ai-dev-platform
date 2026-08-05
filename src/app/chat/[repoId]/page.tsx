"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Loader2,
  ArrowLeft,
  FileCode,
  MessageSquare,
  Trash2,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  _count: { messages: number };
}

interface SourceRef {
  filePath: string;
  startLine: number;
  endLine: number;
  similarity: number;
}

interface RepoInfo {
  id: string;
  name: string;
  fullName: string;
  status: string;
}

export default function ChatPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const repoId = params.repoId as string;

  const [repo, setRepo] = useState<RepoInfo | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [sources, setSources] = useState<SourceRef[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  const fetchConversations = useCallback(async () => {
    const res = await fetch(`/api/conversations?repositoryId=${repoId}`);
    const data = await res.json();
    setConversations(data);
  }, [repoId]);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    if (authStatus === "authenticated") {
      fetch(`/api/repos/${repoId}`)
        .then((r) => r.json())
        .then(setRepo);
      fetchConversations();
    }
  }, [authStatus, repoId, router, fetchConversations]);

  const loadConversation = async (conversationId: string) => {
    setActiveConversationId(conversationId);
    const res = await fetch(`/api/conversations/${conversationId}`);
    const data = await res.json();
    setMessages(data.messages || []);

    const lastAssistant = data.messages?.findLast(
      (m: Message) => m.role === "assistant" && m.sources
    );
    if (lastAssistant?.sources) {
      try {
        setSources(JSON.parse(lastAssistant.sources));
      } catch {
        setSources([]);
      }
    }
  };

  const deleteConversation = async (conversationId: string) => {
    await fetch(`/api/conversations/${conversationId}`, { method: "DELETE" });
    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
      setMessages([]);
      setSources([]);
    }
    fetchConversations();
  };

  const startNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setSources([]);
    setInput("");
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");
    setSources([]);

    setMessages((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        role: "user",
        content: userMessage,
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversationId: activeConversationId,
          repositoryId: repoId,
        }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let newConversationId = activeConversationId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.done) {
              newConversationId = data.conversationId;
              if (data.sources) setSources(data.sources);
            } else if (data.content) {
              fullContent += data.content;
              setStreamingContent(fullContent);
              if (data.conversationId) {
                newConversationId = data.conversationId;
              }
            }
          } catch {
            // skip malformed JSON
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          role: "assistant",
          content: fullContent,
          createdAt: new Date().toISOString(),
        },
      ]);
      setStreamingContent("");

      if (newConversationId && newConversationId !== activeConversationId) {
        setActiveConversationId(newConversationId);
      }
      fetchConversations();
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Sorry, an error occurred. Please try again.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  if (authStatus === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <div className="flex w-72 flex-col border-r border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-slate-800/50">
        <div className="border-b border-gray-200 p-4 dark:border-gray-700">
          <Button
            variant="ghost"
            size="sm"
            className="mb-3 w-full justify-start"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Dashboard
          </Button>
          {repo && (
            <div className="mb-3">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                {repo.fullName}
              </p>
              <Badge
                variant={repo.status === "ready" ? "success" : "warning"}
                className="mt-1"
              >
                {repo.status}
              </Badge>
            </div>
          )}
          <Button variant="primary" size="sm" className="w-full" onClick={startNewChat}>
            <MessageSquare className="mr-1 h-4 w-4" />
            New Chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`group mb-1 flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                activeConversationId === conv.id
                  ? "bg-indigo-100 text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-200"
                  : "text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
              onClick={() => loadConversation(conv.id)}
            >
              <span className="truncate">{conv.title || "Untitled"}</span>
              <button
                className="hidden shrink-0 text-gray-400 hover:text-red-500 group-hover:block"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conv.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 && !streamingContent ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <MessageSquare className="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Ask anything about your codebase
              </h3>
              <p className="mt-2 max-w-md text-sm text-gray-500">
                Your questions will be answered using relevant source code
                retrieved via semantic search.
              </p>
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {[
                  "How is authentication implemented?",
                  "What does the main API endpoint do?",
                  "Explain the database schema",
                  "How are errors handled?",
                ].map((q) => (
                  <button
                    key={q}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-left text-sm text-gray-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 dark:border-gray-600 dark:text-gray-400 dark:hover:border-indigo-600 dark:hover:bg-indigo-950/30"
                    onClick={() => {
                      setInput(q);
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm">
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}

              {/* Streaming message */}
              {isStreaming && streamingContent && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-xl bg-gray-100 px-4 py-3 text-gray-900 dark:bg-gray-700 dark:text-gray-100">
                    <div className="streaming-cursor whitespace-pre-wrap text-sm">
                      {streamingContent}
                    </div>
                  </div>
                </div>
              )}

              {isStreaming && !streamingContent && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-3 dark:bg-gray-700">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                    <span className="text-sm text-gray-500">
                      Searching codebase...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Sources panel */}
        {sources.length > 0 && (
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-3 dark:border-gray-700 dark:bg-slate-800/50">
            <p className="mb-2 text-xs font-medium text-gray-500">
              Sources referenced:
            </p>
            <div className="flex flex-wrap gap-2">
              {sources.slice(0, 5).map((src, i) => (
                <div
                  key={i}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700"
                >
                  <FileCode className="h-3 w-3 text-indigo-500" />
                  <span className="font-medium">{src.filePath}</span>
                  <span className="text-gray-400">
                    :{src.startLine}-{src.endLine}
                  </span>
                  <span className="text-gray-400">
                    ({(src.similarity * 100).toFixed(0)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-gray-200 p-4 dark:border-gray-700">
          <div className="mx-auto flex max-w-3xl gap-3">
            <Input
              placeholder="Ask about your codebase..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              disabled={isStreaming || repo?.status !== "ready"}
              className="flex-1"
            />
            <Button
              variant="primary"
              onClick={sendMessage}
              disabled={isStreaming || !input.trim() || repo?.status !== "ready"}
            >
              {isStreaming ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

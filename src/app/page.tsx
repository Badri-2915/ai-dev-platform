"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Code2,
  Search,
  Zap,
  Shield,
  ArrowRight,
  Database,
  Brain,
  FileCode,
} from "lucide-react";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM2MzY2ZjEiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
          <div className="text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300">
              <Zap className="h-4 w-4" />
              RAG-powered code intelligence
            </div>

            <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl lg:text-7xl">
              Ask your codebase{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                anything
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-400 sm:text-xl">
              Connect your GitHub repos and get instant, accurate answers
              grounded in your actual source code. No hallucinations — every
              response is backed by real code references.
            </p>

            <div className="mt-10 flex items-center justify-center gap-4">
              {session ? (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => router.push("/dashboard")}
                >
                  Go to Dashboard
                  <ArrowRight className="ml-1 h-5 w-5" />
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => signIn("github")}
                >
                  Get Started with GitHub
                  <ArrowRight className="ml-1 h-5 w-5" />
                </Button>
              )}
              <Button variant="outline" size="lg">
                View Demo
              </Button>
            </div>
          </div>

          {/* Code preview mockup */}
          <div className="mx-auto mt-16 max-w-4xl">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-900 shadow-2xl dark:border-gray-700">
              <div className="flex items-center gap-2 border-b border-gray-700 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="ml-2 text-sm text-gray-400">
                  CodeLens AI Chat
                </span>
              </div>
              <div className="p-6 font-mono text-sm">
                <div className="mb-4">
                  <span className="text-indigo-400">You:</span>
                  <span className="ml-2 text-gray-300">
                    How does the authentication middleware work?
                  </span>
                </div>
                <div>
                  <span className="text-green-400">AI:</span>
                  <span className="ml-2 text-gray-300">
                    The authentication middleware is defined in{" "}
                    <span className="rounded bg-gray-800 px-1 text-yellow-300">
                      src/middleware/auth.ts
                    </span>{" "}
                    (lines 15-42). It uses JWT tokens validated via the{" "}
                    <span className="rounded bg-gray-800 px-1 text-yellow-300">
                      verifyToken()
                    </span>{" "}
                    function. On each request, it extracts the Bearer token from
                    the Authorization header, decodes it, and attaches the user
                    object to{" "}
                    <span className="rounded bg-gray-800 px-1 text-yellow-300">
                      req.user
                    </span>
                    ...
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-gray-200 bg-gray-50 py-24 dark:border-gray-800 dark:bg-slate-800/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              A complete RAG pipeline for your codebase in three simple steps
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {[
              {
                icon: FileCode,
                title: "1. Connect Repository",
                desc: "Link your GitHub repos via OAuth or paste a public URL. We clone and analyze every supported code file.",
              },
              {
                icon: Database,
                title: "2. Index & Embed",
                desc: "Code files are chunked intelligently, converted to vector embeddings, and stored in PostgreSQL with pgvector.",
              },
              {
                icon: Brain,
                title: "3. Ask Questions",
                desc: "Ask anything in natural language. We retrieve relevant code via semantic search and generate grounded answers.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-gray-200 bg-white p-8 transition-all hover:border-indigo-300 hover:shadow-lg dark:border-gray-700 dark:bg-slate-800 dark:hover:border-indigo-600"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key benefits */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
                Built for developers who value accuracy
              </h2>
              <div className="mt-8 space-y-6">
                {[
                  {
                    icon: Shield,
                    title: "No Hallucinations",
                    desc: "Every answer is grounded in your actual source code with file paths and line numbers.",
                  },
                  {
                    icon: Search,
                    title: "Semantic Search",
                    desc: "Vector similarity search finds the most relevant code, not just keyword matches.",
                  },
                  {
                    icon: Code2,
                    title: "Multi-Language Support",
                    desc: "Works with TypeScript, Python, Go, Rust, Java, and 20+ programming languages.",
                  },
                  {
                    icon: Zap,
                    title: "Flexible LLM Backend",
                    desc: "Use OpenAI GPT-4o or run locally with Ollama — your choice, your data.",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 dark:border-gray-700 dark:bg-slate-800/50">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                Tech Stack
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  "Next.js 14",
                  "PostgreSQL + pgvector",
                  "OpenAI / Ollama",
                  "Prisma ORM",
                  "Docker",
                  "GitHub Actions",
                  "TypeScript",
                  "Tailwind CSS",
                ].map((tech) => (
                  <div
                    key={tech}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-center text-sm font-medium text-gray-700 dark:border-gray-600 dark:bg-slate-700 dark:text-gray-300"
                  >
                    {tech}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 py-8 dark:border-gray-800 dark:bg-slate-800/50">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center justify-center gap-2">
            <Code2 className="h-4 w-4" />
            <span>CodeLens AI</span>
          </div>
          <p className="mt-2">
            AI Developer Productivity Platform — RAG-powered code intelligence
          </p>
        </div>
      </footer>
    </div>
  );
}

# CodeLens AI — AI Developer Productivity Platform

Connect your GitHub repositories and ask natural language questions about your codebase. Answers are grounded in actual source code using RAG (Retrieval-Augmented Generation), eliminating AI hallucinations.

## Architecture

```
User → Next.js Frontend → API Routes → PostgreSQL (pgvector)
                                     ↘ Worker (clone, chunk, embed)
                                     ↘ LLM Provider (OpenAI / Ollama)
```

**Full RAG Pipeline:** Code files are chunked → embedded into vectors → stored in PostgreSQL → retrieved by semantic similarity → used as context for LLM responses.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | PostgreSQL + pgvector |
| LLM | OpenAI GPT-4o or Ollama (local) |
| Auth | NextAuth.js + GitHub OAuth |
| DevOps | Docker, Docker Compose, GitHub Actions |

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16+ with [pgvector](https://github.com/pgvector/pgvector) extension
- GitHub OAuth App (for authentication)
- OpenAI API key OR Ollama running locally

### 1. Clone and install

```bash
git clone <your-repo-url>
cd ai-dev-platform
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in your `.env` file:

- **`DATABASE_URL`** — PostgreSQL connection string
- **`GITHUB_ID`** / **`GITHUB_SECRET`** — from [GitHub OAuth App](https://github.com/settings/developers)
- **`NEXTAUTH_SECRET`** — generate with `openssl rand -base64 32`
- **`OPENAI_API_KEY`** — if using OpenAI
- **`LLM_PROVIDER`** — `"openai"` or `"ollama"`

### 3. Set up database

```bash
# Start PostgreSQL with pgvector (via Docker)
docker compose up db -d

# Run migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Docker (full stack)

```bash
# With OpenAI
docker compose up -d

# With Ollama (local LLM)
docker compose --profile ollama up -d
```

## Features

- **GitHub OAuth** — sign in and connect private repos
- **Public repo URL** — paste any public GitHub repo URL
- **Smart chunking** — code files split into semantic chunks
- **Vector embeddings** — stored in PostgreSQL with pgvector
- **Semantic search** — cosine similarity retrieval
- **Streaming responses** — real-time LLM output via SSE
- **Source citations** — file paths and line numbers in every answer
- **Dual LLM support** — OpenAI or Ollama, switchable via env
- **Dark/light theme** — full theme support
- **Conversation history** — persistent chat threads per repo

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/          # NextAuth
│   │   ├── chat/          # Chat + streaming SSE
│   │   ├── conversations/ # Conversation CRUD
│   │   ├── github/repos/  # GitHub repo listing
│   │   └── repos/         # Repo CRUD + ingestion
│   ├── auth/signin/       # Sign-in page
│   ├── chat/[repoId]/     # Chat interface
│   ├── dashboard/         # Dashboard
│   └── page.tsx           # Landing page
├── components/
│   ├── ui/                # Reusable UI components
│   ├── navbar.tsx
│   └── providers.tsx
├── lib/
│   ├── auth.ts            # NextAuth config
│   ├── db/prisma.ts       # Prisma client
│   ├── llm/               # LLM/embedding provider abstraction
│   ├── ingestion/         # Clone, chunk, embed pipeline
│   └── search/            # Vector search
└── types/                 # TypeScript declarations
```

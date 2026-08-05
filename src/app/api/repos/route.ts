import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { ingestRepository } from "@/lib/ingestion/pipeline";

// GET /api/repos — list user's connected repos
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repos = await prisma.repository.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(repos);
}

// POST /api/repos — add a new repo (by URL or from GitHub)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { url, name, fullName, isPrivate, branch } = body;

  if (!url || !fullName) {
    return NextResponse.json(
      { error: "url and fullName are required" },
      { status: 400 }
    );
  }

  // Check if repo already exists for this user
  const existing = await prisma.repository.findUnique({
    where: { userId_fullName: { userId: session.user.id, fullName } },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Repository already connected" },
      { status: 409 }
    );
  }

  const repo = await prisma.repository.create({
    data: {
      name: name || fullName.split("/").pop() || fullName,
      fullName,
      url,
      branch: branch || "main",
      isPrivate: isPrivate || false,
      userId: session.user.id,
    },
  });

  // Get access token if private repo
  let accessToken: string | undefined;
  if (isPrivate) {
    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, provider: "github" },
    });
    accessToken = account?.access_token || undefined;
  }

  // Start ingestion in background
  ingestRepository(repo.id, accessToken).catch((err) => {
    console.error(`Failed to ingest repository ${repo.id}:`, err);
  });

  return NextResponse.json(repo, { status: 201 });
}

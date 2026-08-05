import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { ingestRepository } from "@/lib/ingestion/pipeline";

// GET /api/repos/[repoId] — get repo details
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ repoId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { repoId } = await params;

  const repo = await prisma.repository.findFirst({
    where: { id: repoId, userId: session.user.id },
    include: {
      _count: { select: { codeChunks: true, conversations: true } },
    },
  });

  if (!repo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(repo);
}

// DELETE /api/repos/[repoId] — remove repo
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ repoId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { repoId } = await params;

  await prisma.repository.deleteMany({
    where: { id: repoId, userId: session.user.id },
  });

  return NextResponse.json({ success: true });
}

// POST /api/repos/[repoId] — re-index repo
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ repoId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { repoId } = await params;

  const repo = await prisma.repository.findFirst({
    where: { id: repoId, userId: session.user.id },
  });

  if (!repo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Get access token
  let accessToken: string | undefined;
  if (repo.isPrivate) {
    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, provider: "github" },
    });
    accessToken = account?.access_token || undefined;
  }

  // Re-ingest
  await prisma.repository.update({
    where: { id: repoId },
    data: { status: "pending" },
  });

  ingestRepository(repoId, accessToken).catch((err) => {
    console.error(`Failed to re-ingest repository ${repoId}:`, err);
  });

  return NextResponse.json({ success: true, status: "re-indexing" });
}

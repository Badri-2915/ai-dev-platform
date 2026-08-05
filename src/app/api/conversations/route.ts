import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

// GET /api/conversations?repositoryId=xxx
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repositoryId = req.nextUrl.searchParams.get("repositoryId");

  const where: { userId: string; repositoryId?: string } = {
    userId: session.user.id,
  };
  if (repositoryId) where.repositoryId = repositoryId;

  const conversations = await prisma.conversation.findMany({
    where,
    include: {
      repository: { select: { name: true, fullName: true } },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(conversations);
}

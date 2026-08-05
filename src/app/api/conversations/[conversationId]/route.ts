import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

// GET /api/conversations/[conversationId] — get conversation with messages
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await params;

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId: session.user.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      repository: { select: { name: true, fullName: true } },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(conversation);
}

// DELETE /api/conversations/[conversationId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await params;

  await prisma.conversation.deleteMany({
    where: { id: conversationId, userId: session.user.id },
  });

  return NextResponse.json({ success: true });
}

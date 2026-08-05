import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

// GET /api/github/repos — list user's GitHub repos
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "github" },
  });

  if (!account?.access_token) {
    return NextResponse.json(
      { error: "No GitHub account linked" },
      { status: 400 }
    );
  }

  const response = await fetch(
    "https://api.github.com/user/repos?per_page=100&sort=updated&type=all",
    {
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "Failed to fetch repos from GitHub" },
      { status: response.status }
    );
  }

  const repos = await response.json();

  const simplified = repos.map((repo: {
    full_name: string;
    name: string;
    html_url: string;
    private: boolean;
    default_branch: string;
    description: string | null;
    language: string | null;
    stargazers_count: number;
    updated_at: string;
  }) => ({
    fullName: repo.full_name,
    name: repo.name,
    url: repo.html_url,
    cloneUrl: `https://github.com/${repo.full_name}.git`,
    isPrivate: repo.private,
    defaultBranch: repo.default_branch,
    description: repo.description,
    language: repo.language,
    stars: repo.stargazers_count,
    updatedAt: repo.updated_at,
  }));

  return NextResponse.json(simplified);
}

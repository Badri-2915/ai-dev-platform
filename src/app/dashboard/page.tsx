"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  RefreshCw,
  Trash2,
  MessageSquare,
  Loader2,
  Link as LinkIcon,
  Search,
  FolderGit2,
} from "lucide-react";

interface Repository {
  id: string;
  name: string;
  fullName: string;
  url: string;
  branch: string;
  isPrivate: boolean;
  status: string;
  fileCount: number;
  chunkCount: number;
  createdAt: string;
}

interface GitHubRepo {
  fullName: string;
  name: string;
  url: string;
  cloneUrl: string;
  isPrivate: boolean;
  defaultBranch: string;
  description: string | null;
  language: string | null;
  stars: number;
}

const statusVariant: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  pending: "default",
  cloning: "info",
  indexing: "warning",
  ready: "success",
  error: "error",
};

export default function DashboardPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [addingRepo, setAddingRepo] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingGithub, setLoadingGithub] = useState(false);

  const fetchRepos = useCallback(async () => {
    const res = await fetch("/api/repos");
    const data = await res.json();
    setRepos(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    if (authStatus === "authenticated") {
      fetchRepos();
      const interval = setInterval(fetchRepos, 5000);
      return () => clearInterval(interval);
    }
  }, [authStatus, router, fetchRepos]);

  const fetchGithubRepos = async () => {
    setLoadingGithub(true);
    const res = await fetch("/api/github/repos");
    const data = await res.json();
    setGithubRepos(data);
    setLoadingGithub(false);
  };

  const addRepoFromGithub = async (ghRepo: GitHubRepo) => {
    setAddingRepo(true);
    await fetch("/api/repos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: ghRepo.cloneUrl,
        name: ghRepo.name,
        fullName: ghRepo.fullName,
        isPrivate: ghRepo.isPrivate,
        branch: ghRepo.defaultBranch,
      }),
    });
    setAddingRepo(false);
    setShowAddModal(false);
    fetchRepos();
  };

  const addRepoFromUrl = async () => {
    if (!urlInput.trim()) return;
    setAddingRepo(true);

    let url = urlInput.trim();
    if (!url.endsWith(".git")) url += ".git";
    const match = url.match(/github\.com\/([^/]+\/[^/.]+)/);
    const fullName = match ? match[1] : url;
    const name = fullName.split("/").pop() || fullName;

    await fetch("/api/repos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        name,
        fullName,
        isPrivate: false,
        branch: "main",
      }),
    });
    setAddingRepo(false);
    setShowUrlInput(false);
    setUrlInput("");
    fetchRepos();
  };

  const deleteRepo = async (id: string) => {
    await fetch(`/api/repos/${id}`, { method: "DELETE" });
    fetchRepos();
  };

  const reindexRepo = async (id: string) => {
    await fetch(`/api/repos/${id}`, { method: "POST" });
    fetchRepos();
  };

  if (authStatus === "loading" || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const filteredGithubRepos = githubRepos.filter(
    (r) =>
      r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !repos.some((cr) => cr.fullName === r.fullName)
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Welcome back, {session?.user?.name}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowUrlInput(!showUrlInput)}>
            <LinkIcon className="mr-1 h-4 w-4" />
            Add by URL
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setShowAddModal(true);
              fetchGithubRepos();
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            Connect Repo
          </Button>
        </div>
      </div>

      {/* URL Input */}
      {showUrlInput && (
        <Card className="mb-6">
          <CardContent className="flex gap-3 p-4">
            <Input
              placeholder="https://github.com/user/repo"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addRepoFromUrl()}
            />
            <Button
              variant="primary"
              onClick={addRepoFromUrl}
              disabled={addingRepo}
            >
              {addingRepo ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Add"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* GitHub Repos Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Select a Repository
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddModal(false)}
              >
                Close
              </Button>
            </div>
            <div className="mb-4">
              <Input
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {loadingGithub ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                </div>
              ) : filteredGithubRepos.length === 0 ? (
                <p className="py-8 text-center text-gray-500">
                  No repos found
                </p>
              ) : (
                filteredGithubRepos.map((repo) => (
                  <div
                    key={repo.fullName}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-3 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {repo.fullName}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        {repo.language && <span>{repo.language}</span>}
                        {repo.isPrivate && (
                          <Badge variant="warning">Private</Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => addRepoFromGithub(repo)}
                      disabled={addingRepo}
                    >
                      {addingRepo ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Connect"
                      )}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Connected Repos Grid */}
      {repos.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
          <FolderGit2 className="mb-4 h-12 w-12 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            No repositories connected
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Connect a GitHub repo or add one by URL to get started
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {repos.map((repo) => (
            <Card key={repo.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="truncate text-base">
                    {repo.fullName}
                  </CardTitle>
                  <Badge variant={statusVariant[repo.status] || "default"}>
                    {repo.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-4">
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <div>
                    <span className="font-medium">Files:</span> {repo.fileCount}
                  </div>
                  <div>
                    <span className="font-medium">Chunks:</span>{" "}
                    {repo.chunkCount}
                  </div>
                  <div>
                    <span className="font-medium">Branch:</span> {repo.branch}
                  </div>
                  <div>
                    <span className="font-medium">Type:</span>{" "}
                    {repo.isPrivate ? "Private" : "Public"}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1"
                    disabled={repo.status !== "ready"}
                    onClick={() => router.push(`/chat/${repo.id}`)}
                  >
                    <MessageSquare className="mr-1 h-4 w-4" />
                    Chat
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => reindexRepo(repo.id)}
                    disabled={
                      repo.status === "cloning" || repo.status === "indexing"
                    }
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-600"
                    onClick={() => deleteRepo(repo.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

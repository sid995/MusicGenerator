"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Music } from "lucide-react";
import { TrackList, type Track } from "~/components/create/track-list";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";

type Category = { id: string; name: string };

type Props = {
  tracks: Track[];
  categories: Category[];
  currentStatus: string;
  currentSort: string;
  currentCategoryNames: string[];
  currentInstrumental: string;
};

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "queued", label: "Queued" },
  { value: "processing", label: "Processing" },
  { value: "processed", label: "Processed" },
  { value: "failed", label: "Failed" },
  { value: "no credits", label: "No credits" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "likes", label: "Most liked" },
  { value: "title", label: "Title A–Z" },
];

const INSTRUMENTAL_OPTIONS = [
  { value: "all", label: "All" },
  { value: "yes", label: "Instrumental only" },
  { value: "no", label: "With vocals only" },
];

export function LibraryView({
  tracks,
  categories,
  currentStatus,
  currentSort,
  currentCategoryNames,
  currentInstrumental,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (
      value === "all" ||
      value === "" ||
      (key === "category" && value === "all")
    ) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    router.push(`/library?${next.toString()}`);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const next = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      next.delete("category");
    } else {
      next.set("category", value);
    }
    router.push(`/library?${next.toString()}`);
  };

  const categorySelectValue =
    currentCategoryNames.length === 1
      ? currentCategoryNames[0]
      : currentCategoryNames.length > 1
        ? currentCategoryNames[0]
        : "all";

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <h1 className="text-2xl font-bold tracking-tight">My Library</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          View and manage your generated songs.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Status</Label>
            <select
              value={currentStatus}
              onChange={(e) => setParam("status", e.target.value)}
              className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-[160px] rounded-md border px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Category</Label>
            <select
              value={categorySelectValue}
              onChange={handleCategoryChange}
              className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-[160px] rounded-md border px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Instrumental</Label>
            <select
              value={currentInstrumental}
              onChange={(e) => setParam("instrumental", e.target.value)}
              className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-[160px] rounded-md border px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              {INSTRUMENTAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Sort</Label>
            <select
              value={currentSort}
              onChange={(e) => setParam("sort", e.target.value)}
              className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-[160px] rounded-md border px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <Music className="text-muted-foreground h-16 w-16" />
            <h2 className="text-xl font-semibold">No songs yet</h2>
            <p className="text-muted-foreground max-w-sm text-sm">
              You haven&apos;t created any songs yet. Create your first song to get
              started.
            </p>
            <Button asChild className="cursor-pointer">
              <Link href="/create">Create song</Link>
            </Button>
          </div>
        ) : (
          <TrackList tracks={tracks} />
        )}
      </div>
    </div>
  );
}

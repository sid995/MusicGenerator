"use client";

import { Heart, Loader2, Music, Play, Share2 } from "lucide-react";
import { useState } from "react";
import { getPublicPlayUrl } from "~/actions/generation";
import { toggleLikeSong } from "~/actions/song";
import { usePlayerStore } from "~/stores/use-player-store";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";

type Props = {
  songId: string;
  title: string;
  thumbnailUrl: string | null;
  creatorName: string | null;
  likeCount: number;
  listenCount: number;
  categories: string[];
  isLiked: boolean;
  hasSession: boolean;
};

export function SongShareView({
  songId,
  title,
  thumbnailUrl,
  creatorName,
  likeCount,
  listenCount,
  categories,
  isLiked: initialLiked,
  hasSession,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(likeCount);
  const setTrack = usePlayerStore((state) => state.setTrack);

  const handlePlay = async () => {
    setIsLoading(true);
    const playUrl = await getPublicPlayUrl(songId);
    if (playUrl) {
      setTrack({
        id: songId,
        title,
        url: playUrl,
        artwork: thumbnailUrl,
        prompt: null,
        createdByUserName: creatorName,
      });
    } else {
      toast.error("Could not load audio.");
    }
    setIsLoading(false);
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasSession) return;
    setIsLiked(!isLiked);
    setLikesCount((c) => (isLiked ? c - 1 : c + 1));
    await toggleLikeSong(songId);
  };

  const handleCopyLink = async () => {
    const url =
      typeof window !== "undefined"
        ? window.location.href
        : `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/song/${songId}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          onClick={handlePlay}
          className="group relative aspect-square w-full shrink-0 cursor-pointer overflow-hidden rounded-lg bg-muted sm:w-72"
        >
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={title}
              className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Music className="text-muted-foreground h-16 w-16" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            {isLoading ? (
              <Loader2 className="h-12 w-12 animate-spin text-white" />
            ) : (
              <Play className="h-12 w-12 fill-white text-white" />
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground text-sm">
            {creatorName ?? "Unknown artist"}
          </p>
          <div className="flex flex-wrap gap-2">
            {categories.map((name) => (
              <span
                key={name}
                className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium"
              >
                {name}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{listenCount} listens</span>
            {hasSession && (
              <button
                type="button"
                onClick={handleLike}
                className="flex cursor-pointer items-center gap-1 hover:text-foreground"
              >
                <Heart
                  className={`h-4 w-4 ${isLiked ? "fill-red-500 text-red-500" : ""}`}
                />
                {likesCount} likes
              </button>
            )}
            {!hasSession && (
              <span className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                {likesCount} likes
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 w-fit cursor-pointer"
            onClick={handleCopyLink}
          >
            <Share2 className="mr-2 h-4 w-4" />
            Copy link
          </Button>
        </div>
      </div>
    </div>
  );
}

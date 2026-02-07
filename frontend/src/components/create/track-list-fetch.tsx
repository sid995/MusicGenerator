"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPresignedUrl } from "~/actions/generation";
import { auth } from "~/lib/auth";
import { db } from "~/server/db";
import { TrackList } from "./track-list";

export default async function TrackListFetcher() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth/sign-in");
  }

  const songs = await db.song.findMany({
    where: {
      userId: session?.user?.id,
    },
    include: {
      user: {
        select: { name: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const songsWithThumbnails = await Promise.all(
    songs.map(async (song) => {
      const thumbnailUrl = song.thumbnailS3Key
        ? await getPresignedUrl(song.thumbnailS3Key)
        : null;

      return {
        id: song.id,
        title: song.title,
        createdAt: song.createdAt,
        instrumental: song.instrumental,
        prompt: song.prompt,
        lyrics: song.lyrics,
        describedLyrics: song.describedLyrics,
        fullDescribedSong: song.fullDescribedSong,
        thumbnailUrl,
        playUrl: null,
        status: song.status,
        createdByUserName: song.user?.name,
        published: song.published,
        vocalsS3Key: song.vocalsS3Key ?? null,
        drumsS3Key: song.drumsS3Key ?? null,
        bassS3Key: song.bassS3Key ?? null,
        otherS3Key: song.otherS3Key ?? null,
      };
    }),
  );

  return <TrackList tracks={songsWithThumbnails} />;
}

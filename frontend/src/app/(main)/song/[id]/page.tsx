import { notFound } from "next/navigation";
import { getPresignedUrl } from "~/actions/generation";
import { db } from "~/server/db";
import { auth } from "~/lib/auth";
import { headers } from "next/headers";
import { SongShareView } from "~/components/song/song-share-view";
import type { Metadata } from "next";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const song = await db.song.findUnique({
    where: { id, published: true },
    select: {
      title: true,
      user: { select: { name: true } },
      thumbnailS3Key: true,
    },
  });

  if (!song) return { title: "Song not found" };

  const description = `Listen to "${song.title}" by ${song.user.name} on MusicGenerator.`;
  const imageUrl = song.thumbnailS3Key
    ? await getPresignedUrl(song.thumbnailS3Key)
    : undefined;

  return {
    title: `${song.title} – ${song.user.name}`,
    description,
    openGraph: {
      title: `${song.title} – ${song.user.name}`,
      description,
      images: imageUrl ? [{ url: imageUrl, width: 512, height: 512 }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: `${song.title} – ${song.user.name}`,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
  };
}

export default async function SongSharePage({ params }: Props) {
  const { id } = await params;

  const song = await db.song.findUnique({
    where: { id, published: true },
    include: {
      user: { select: { name: true } },
      categories: true,
      _count: { select: { likes: true } },
    },
  });

  if (!song) notFound();

  const thumbnailUrl = song.thumbnailS3Key
    ? await getPresignedUrl(song.thumbnailS3Key)
    : null;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const currentUserLike = session
    ? await db.like.findUnique({
        where: {
          userId_songId: { userId: session.user.id, songId: id },
        },
      })
    : null;

  return (
    <SongShareView
      songId={song.id}
      title={song.title}
      thumbnailUrl={thumbnailUrl}
      creatorName={song.user.name}
      likeCount={song._count.likes}
      listenCount={song.listenCount}
      categories={song.categories.map((c) => c.name)}
      isLiked={!!currentUserLike}
      hasSession={!!session}
    />
  );
}

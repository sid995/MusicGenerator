import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "~/lib/auth";
import { db } from "~/server/db";
import { getPresignedUrl } from "~/actions/generation";
import { LibraryView } from "~/components/library/library-view";
import type { Track } from "~/components/create/track-list";

type SearchParams = Promise<{
  status?: string;
  sort?: string;
  category?: string;
  instrumental?: string;
}>;

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) redirect("/auth/sign-in");

  const params = await searchParams;
  const statusFilter = params.status ?? "all";
  const sortBy = params.sort ?? "newest";
  const categoryNames = params.category
    ? params.category.split(",").filter(Boolean)
    : [];
  const instrumentalFilter = params.instrumental ?? "all";

  const categories =
    categoryNames.length > 0
      ? await db.category.findMany({
          where: { name: { in: categoryNames } },
          select: { id: true },
        })
      : [];

  const categoryIds = categories.map((c) => c.id);

  const statusWhere =
    statusFilter === "all"
      ? {}
      : { status: statusFilter };

  const categoryWhere =
    categoryIds.length > 0
      ? { categories: { some: { id: { in: categoryIds } } } }
      : {};

  const instrumentalWhere =
    instrumentalFilter === "all"
      ? {}
      : instrumentalFilter === "yes"
        ? { instrumental: true }
        : { instrumental: false };

  const orderBy =
    sortBy === "oldest"
      ? { createdAt: "asc" as const }
      : sortBy === "likes"
        ? { likes: { _count: "desc" as const } }
        : sortBy === "title"
          ? { title: "asc" as const }
          : { createdAt: "desc" as const };

  const songs = await db.song.findMany({
    where: {
      userId: session.user.id,
      ...statusWhere,
      ...categoryWhere,
      ...instrumentalWhere,
    },
    include: {
      user: { select: { name: true } },
      categories: true,
    },
    orderBy,
  });

  const tracks: Track[] = await Promise.all(
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
        createdByUserName: song.user?.name ?? null,
        published: song.published,
        vocalsS3Key: song.vocalsS3Key ?? null,
        drumsS3Key: song.drumsS3Key ?? null,
        bassS3Key: song.bassS3Key ?? null,
        otherS3Key: song.otherS3Key ?? null,
      };
    }),
  );

  const allCategories = await db.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <LibraryView
      tracks={tracks}
      categories={allCategories}
      currentStatus={statusFilter}
      currentSort={sortBy}
      currentCategoryNames={categoryNames}
      currentInstrumental={instrumentalFilter}
    />
  );
}

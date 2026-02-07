"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { inngest } from "~/inngest/client";
import { auth } from "~/lib/auth";
import { db } from "~/server/db";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "~/env";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface GenerateRequest {
  prompt?: string;
  lyrics?: string;
  fullDescribedSong?: string;
  describedLyrics?: string;
  instrumental?: boolean;
  audioDuration?: number;
}

export async function generateSong(generateRequest: GenerateRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) redirect("/auth/sign-in");

  const user = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { credits: true },
  });

  if (user.credits <= 0) {
    throw new Error("Not enough credits to generate a song.");
  }

  await queueSong(
    generateRequest,
    15,
    session.user.id,
    generateRequest.audioDuration ?? 180,
  );

  revalidatePath("/create");
}

export async function queueSong(
  generateRequest: GenerateRequest,
  guidanceScale: number,
  userId: string,
  audioDurationSeconds = 180,
) {
  let title = "Untitled";
  if (generateRequest.describedLyrics) title = generateRequest.describedLyrics;
  if (generateRequest.fullDescribedSong)
    title = generateRequest.fullDescribedSong;

  title = title.charAt(0).toUpperCase() + title.slice(1);

  const song = await db.song.create({
    data: {
      userId: userId,
      title: title,
      prompt: generateRequest.prompt,
      lyrics: generateRequest.lyrics,
      describedLyrics: generateRequest.describedLyrics,
      fullDescribedSong: generateRequest.fullDescribedSong,
      instrumental: generateRequest.instrumental,
      guidanceScale: guidanceScale,
      audioDuration: audioDurationSeconds,
    },
  });

  await inngest.send({
    name: "generate-song-event",
    data: { songId: song.id, userId: song.userId },
  });
}

export async function getPlayUrl(songId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) redirect("/auth/sign-in");

  const song = await db.song.findUniqueOrThrow({
    where: {
      id: songId,
      OR: [{ userId: session.user.id }, { published: true }],
      s3Key: {
        not: null,
      },
    },
    select: {
      s3Key: true,
    },
  });

  await db.song.update({
    where: {
      id: songId,
    },
    data: {
      listenCount: {
        increment: 1,
      },
    },
  });

  return await getPresignedUrl(song.s3Key!);
}

/** Returns presigned play URL for a published song. Does not require auth. */
export async function getPublicPlayUrl(songId: string) {
  const song = await db.song.findUnique({
    where: {
      id: songId,
      published: true,
      s3Key: { not: null },
    },
    select: { s3Key: true },
  });

  if (!song?.s3Key) return null;

  await db.song.update({
    where: { id: songId },
    data: { listenCount: { increment: 1 } },
  });

  return getPresignedUrl(song.s3Key);
}

export async function requestExtendSong(
  parentSongId: string,
  additionalDurationSeconds: number,
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) redirect("/auth/sign-in");

  const parent = await db.song.findUniqueOrThrow({
    where: { id: parentSongId, userId: session.user.id },
    select: { title: true },
  });

  const song = await db.song.create({
    data: {
      userId: session.user.id,
      title: `${parent.title} (extended)`,
      parentSongId,
      status: "queued",
    },
  });

  await inngest.send({
    name: "extend-song-event",
    data: {
      songId: song.id,
      userId: session.user.id,
      parentSongId,
      additionalDurationSeconds,
    },
  });

  revalidatePath("/create");
  revalidatePath("/library");
}

export async function requestStemSplit(songId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) redirect("/auth/sign-in");

  const song = await db.song.findUniqueOrThrow({
    where: { id: songId, userId: session.user.id },
    select: { s3Key: true, vocalsS3Key: true },
  });

  if (!song.s3Key) {
    throw new Error("Song has no audio to split.");
  }
  if (song.vocalsS3Key) {
    throw new Error("Stems already exist for this song.");
  }

  await inngest.send({
    name: "split-stems-event",
    data: { songId },
  });

  revalidatePath("/create");
  revalidatePath("/library");
}

const STEM_TYPES = ["vocals", "drums", "bass", "other"] as const;
export type StemType = (typeof STEM_TYPES)[number];

export async function getStemDownloadUrl(
  songId: string,
  stemType: StemType,
): Promise<string | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) redirect("/auth/sign-in");

  const keyField =
    stemType === "vocals"
      ? "vocalsS3Key"
      : stemType === "drums"
        ? "drumsS3Key"
        : stemType === "bass"
          ? "bassS3Key"
          : "otherS3Key";

  const song = await db.song.findUnique({
    where: { id: songId, userId: session.user.id },
    select: { [keyField]: true },
  });

  const key = song?.[keyField as keyof typeof song];
  if (typeof key !== "string") return null;

  return getPresignedUrl(key);
}

export async function getPresignedUrl(key: string) {
  const s3Client = new S3Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY_ID,
    },
  });

  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, {
    expiresIn: 3600,
  });
}

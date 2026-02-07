import { db } from "~/server/db";
import { inngest } from "./client";
import { env } from "~/env";
import { PLANS } from "~/lib/plan";
import { calculateCredits, type GenerationMode } from "~/lib/credits";

export const generateSong = inngest.createFunction(
  {
    id: "generate-song",
    concurrency: {
      limit: 1,
      key: "event.data.userId",
    },
    onFailure: async ({ event }) => {
      await db.song.update({
        where: {
          id: (event?.data?.event?.data as { songId: string }).songId,
        },
        data: {
          status: "failed",
        },
      });
    },
  },
  { event: "generate-song-event" },
  async ({ event, step }) => {
    const { songId } = event.data as {
      songId: string;
      userId: string;
    };

    const { userId, credits, endpoint, body, cost } = await step.run(
      "check-credits",
      async () => {
        const song = await db.song.findUniqueOrThrow({
          where: {
            id: songId,
          },
          select: {
            user: {
              select: {
                id: true,
                credits: true,
                plan: true,
              },
            },
            prompt: true,
            lyrics: true,
            fullDescribedSong: true,
            describedLyrics: true,
            instrumental: true,
            guidanceScale: true,
            inferStep: true,
            audioDuration: true,
            seed: true,
          },
        });

        type RequestBody = {
          guidance_scale?: number;
          infer_step?: number;
          audio_duration?: number;
          seed?: number;
          full_described_song?: string;
          prompt?: string;
          lyrics?: string;
          described_lyrics?: string;
          instrumental?: boolean;
        };

        let endpoint = "";
        let body: RequestBody = {};

        const commonParams = {
          guidance_scale: song.guidanceScale ?? undefined,
          infer_step: song.inferStep ?? undefined,
          audio_duration: song.audioDuration ?? undefined,
          seed: song.seed ?? undefined,
          instrumental: song.instrumental ?? undefined,
        };

        // Description of a song
        if (song.fullDescribedSong) {
          endpoint = env.GENERATE_FROM_DESCRIPTION;
          body = {
            full_described_song: song.fullDescribedSong,
            ...commonParams,
          };
        }

        // Custom mode: Lyrics + prompt
        else if (song.lyrics && song.prompt) {
          endpoint = env.GENERATE_WITH_LYRICS;
          body = {
            lyrics: song.lyrics,
            prompt: song.prompt,
            ...commonParams,
          };
        }

        // Custom mode: Prompt + described lyrics
        else if (song.describedLyrics && song.prompt) {
          endpoint = env.GENERATE_FROM_DESCRIBED_LYRICS;
          body = {
            described_lyrics: song.describedLyrics,
            prompt: song.prompt,
            ...commonParams,
          };
        }

        // No valid mode detected
        if (!endpoint) {
          throw new Error("Could not determine generation mode for song.");
        }

        // Enforce plan-based constraints
        const plan = PLANS[song.user.plan as keyof typeof PLANS];
        const requestedDuration = body.audio_duration ?? undefined;

        if (
          requestedDuration &&
          requestedDuration > plan.maxAudioDurationSeconds
        ) {
          throw new Error(
            `Requested duration ${requestedDuration}s exceeds plan limit of ${plan.maxAudioDurationSeconds}s.`,
          );
        }

        const durationSeconds = requestedDuration ?? plan.maxAudioDurationSeconds;

        let mode: GenerationMode = "simple";
        if (song.lyrics && song.prompt) {
          mode = "prompt_with_lyrics";
        } else if (song.describedLyrics && song.prompt) {
          mode = "prompt_with_described_lyrics";
        }

        const cost = calculateCredits({
          durationSeconds,
          mode,
          plan: plan.id,
        });

        return {
          userId: song.user.id,
          credits: song.user.credits,
          endpoint: endpoint,
          body: body,
          plan: plan.id,
          cost,
        };
      },
    );

    if (credits >= cost) {
      // Generate the song
      await step.run("set-status-processing", async () => {
        return await db.song.update({
          where: {
            id: songId,
          },
          data: {
            status: "processing",
          },
        });
      });

      const response = await step.fetch(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          "Modal-Key": env.MODAL_KEY,
          "Modal-Secret": env.MODAL_SECRET,
        },
      });

      await step.run("update-song-result", async () => {
        let responseData:
          | {
              s3_key: string;
              cover_image_s3_key: string;
              categories: string[];
            }
          | null = null;

        if (response.ok) {
          responseData = (await response.json()) as {
            s3_key: string;
            cover_image_s3_key: string;
            categories: string[];
          };
        } else {
          const errorBody = await response.text();
          console.error("Music generation failed", {
            status: response.status,
            body: errorBody,
          });
        }

        await db.song.update({
          where: {
            id: songId,
          },
          data: {
            s3Key: responseData?.s3_key,
            thumbnailS3Key: responseData?.cover_image_s3_key,
            status: response.ok ? "processed" : "failed",
          },
        });

        if (responseData && responseData.categories.length > 0) {
          await db.song.update({
            where: { id: songId },
            data: {
              categories: {
                connectOrCreate: responseData.categories.map(
                  (categoryName) => ({
                    where: { name: categoryName },
                    create: { name: categoryName },
                  }),
                ),
              },
            },
          });
        }
      });

      return await step.run("deduct-credits", async () => {
        if (!response.ok) return;

        return await db.user.update({
          where: { id: userId },
          data: {
            credits: {
              decrement: cost,
            },
          },
        });
      });
    } else {
      // Set song status "not enough credits"
      await step.run("set-status-no-credits", async () => {
        return await db.song.update({
          where: {
            id: songId,
          },
          data: {
            status: "no credits",
          },
        });
      });
    }
  },
);

export const extendSong = inngest.createFunction(
  {
    id: "extend-song",
    concurrency: {
      limit: 1,
      key: "event.data.userId",
    },
    onFailure: async ({ event }) => {
      const data = event?.data?.event?.data as { songId?: string };
      if (data?.songId) {
        await db.song.update({
          where: { id: data.songId },
          data: { status: "failed" },
        });
      }
    },
  },
  { event: "extend-song-event" },
  async ({ event, step }) => {
    const { songId, userId, parentSongId, additionalDurationSeconds } = event
      .data as {
      songId: string;
      userId: string;
      parentSongId: string;
      additionalDurationSeconds: number;
    };

    const extendEndpoint = env.GENERATE_EXTEND_SONG;
    if (!extendEndpoint) {
      await step.run("set-status-no-extend-endpoint", async () => {
        return await db.song.update({
          where: { id: songId },
          data: {
            status: "failed",
          },
        });
      });
      return;
    }

    const extendPayload = await step.run(
      "load-parent-and-check-credits",
      async () => {
        const parent = await db.song.findUniqueOrThrow({
          where: { id: parentSongId },
          select: { s3Key: true },
        });
        if (!parent.s3Key) {
          throw new Error("Parent song has no audio.");
        }
        const user = await db.user.findUniqueOrThrow({
          where: { id: userId },
          select: { credits: true, plan: true },
        });
        const plan = PLANS[user.plan as keyof typeof PLANS];
        const cost = calculateCredits({
          durationSeconds: additionalDurationSeconds,
          mode: "simple",
          plan: plan.id,
        });
        return {
          parentS3Key: parent.s3Key,
          credits: user.credits,
          cost,
        };
      },
    );

    const { parentS3Key, credits, cost } = extendPayload;

    if (credits < cost) {
      await step.run("set-status-no-credits-extend", async () => {
        return await db.song.update({
          where: { id: songId },
          data: { status: "no credits" },
        });
      });
      return;
    }

    await step.run("set-status-processing-extend", async () => {
      return await db.song.update({
        where: { id: songId },
        data: { status: "processing" },
      });
    });

    const response = await step.fetch(extendEndpoint, {
      method: "POST",
      body: JSON.stringify({
        parent_s3_key: parentS3Key,
        additional_duration_seconds: additionalDurationSeconds,
      }),
      headers: {
        "Content-Type": "application/json",
        "Modal-Key": env.MODAL_KEY,
        "Modal-Secret": env.MODAL_SECRET,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Extend song failed", {
        status: response.status,
        body: errorBody,
      });
      await step.run("set-status-failed-extend", async () => {
        return await db.song.update({
          where: { id: songId },
          data: { status: "failed" },
        });
      });
      return;
    }

    const rawData = (await response.json()) as
      | { s3_key: string; cover_image_s3_key: string; categories: string[] }
      | { error?: string };
    if ("error" in rawData) {
      await step.run("set-status-failed-extend-msg", async () => {
        return await db.song.update({
          where: { id: songId },
          data: { status: "failed" },
        });
      });
      return;
    }

    const data = rawData as {
      s3_key: string;
      cover_image_s3_key: string;
      categories: string[];
    };

    await step.run("update-extended-song-result", async () => {
      await db.song.update({
        where: { id: songId },
        data: {
          s3Key: data.s3_key,
          thumbnailS3Key: data.cover_image_s3_key,
          status: "processed",
        },
      });
      if (data.categories.length > 0) {
        await db.song.update({
          where: { id: songId },
          data: {
            categories: {
              connectOrCreate: data.categories.map((name: string) => ({
                where: { name },
                create: { name },
              })),
            },
          },
        });
      }
    });

    await step.run("deduct-credits-extend", async () => {
      return await db.user.update({
        where: { id: userId },
        data: { credits: { decrement: cost } },
      });
    });
  },
);

export const splitStems = inngest.createFunction(
  {
    id: "split-stems",
    concurrency: { limit: 2 },
    onFailure: async ({ event }) => {
      const data = event?.data?.event?.data as { songId?: string };
      if (data?.songId) {
        await db.song.update({
          where: { id: data.songId },
          data: {
            vocalsS3Key: null,
            drumsS3Key: null,
            bassS3Key: null,
            otherS3Key: null,
          },
        });
      }
    },
  },
  { event: "split-stems-event" },
  async ({ event, step }) => {
    const { songId } = event.data as { songId: string };
    const endpoint = env.GENERATE_SPLIT_STEMS;
    if (!endpoint) {
      await step.run("set-split-failed-no-endpoint", async () => {
        return await db.song.update({
          where: { id: songId },
          data: {},
        });
      });
      return;
    }

    const song = await step.run("load-song-for-split", async () => {
      return await db.song.findUniqueOrThrow({
        where: { id: songId },
        select: { s3Key: true },
      });
    });

    if (!song.s3Key) {
      return;
    }

    const response = await step.fetch(endpoint, {
      method: "POST",
      body: JSON.stringify({
        song_id: songId,
        mix_s3_key: song.s3Key,
      }),
      headers: {
        "Content-Type": "application/json",
        "Modal-Key": env.MODAL_KEY,
        "Modal-Secret": env.MODAL_SECRET,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Split stems failed", { status: response.status, body: errText });
      return;
    }

    const data = (await response.json()) as {
      vocals_s3_key?: string;
      drums_s3_key?: string;
      bass_s3_key?: string;
      other_s3_key?: string;
    };

    await step.run("save-stem-keys", async () => {
      return await db.song.update({
        where: { id: songId },
        data: {
          vocalsS3Key: data.vocals_s3_key ?? null,
          drumsS3Key: data.drums_s3_key ?? null,
          bassS3Key: data.bass_s3_key ?? null,
          otherS3Key: data.other_s3_key ?? null,
        },
      });
    });
  },
);

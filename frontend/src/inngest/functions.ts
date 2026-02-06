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

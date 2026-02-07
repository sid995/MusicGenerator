import { serve } from "inngest/next";
import { inngest } from "~/inngest/client";
import { generateSong, extendSong, splitStems } from "~/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateSong, extendSong, splitStems],
});

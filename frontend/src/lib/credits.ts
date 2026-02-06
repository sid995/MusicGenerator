import type { PlanId } from "./plan";

export type GenerationMode =
  | "simple"
  | "prompt_with_lyrics"
  | "prompt_with_described_lyrics";

const BASE_COST = 1;

export function getDurationFactor(audioDurationSeconds: number): number {
  if (audioDurationSeconds <= 60) return 1;
  if (audioDurationSeconds <= 180) return 2;
  if (audioDurationSeconds <= 240) return 3;
  // Cap at factor 3 for now
  return 3;
}

export function getModeFactor(mode: GenerationMode): number {
  switch (mode) {
    case "prompt_with_lyrics":
      return 1.2;
    case "prompt_with_described_lyrics":
      return 1.4;
    case "simple":
    default:
      return 1.0;
  }
}

export function getPlanFactor(plan: PlanId): number {
  switch (plan) {
    case "PRO":
      return 0.8;
    case "STUDIO":
      return 0.6;
    case "FREE":
    default:
      return 1.0;
  }
}

export function calculateCredits(options: {
  durationSeconds: number;
  mode: GenerationMode;
  plan: PlanId;
}): number {
  const durationFactor = getDurationFactor(options.durationSeconds);
  const modeFactor = getModeFactor(options.mode);
  const planFactor = getPlanFactor(options.plan);

  const raw =
    BASE_COST * durationFactor * modeFactor * planFactor;

  const rounded = Math.ceil(raw);

  return Math.max(1, rounded);
}


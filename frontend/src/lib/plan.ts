export type PlanId = "FREE" | "PRO" | "STUDIO";

export type PlanDefinition = {
  id: PlanId;
  label: string;
  description: string;
  creditsPerMonth: number;
  maxAudioDurationSeconds: number;
};

export const PLANS: Record<PlanId, PlanDefinition> = {
  FREE: {
    id: "FREE",
    label: "Free",
    description: "Get started with a few short tracks each month.",
    creditsPerMonth: 10,
    maxAudioDurationSeconds: 60,
  },
  PRO: {
    id: "PRO",
    label: "Pro",
    description: "More credits and longer tracks for serious creators.",
    creditsPerMonth: 50,
    maxAudioDurationSeconds: 180,
  },
  STUDIO: {
    id: "STUDIO",
    label: "Studio",
    description: "High limits and priority generation for studios.",
    creditsPerMonth: 200,
    maxAudioDurationSeconds: 240,
  },
};

export function getPlanForCredits(credits: number): PlanDefinition {
  if (credits >= PLANS.STUDIO.creditsPerMonth) return PLANS.STUDIO;
  if (credits >= PLANS.PRO.creditsPerMonth) return PLANS.PRO;
  return PLANS.FREE;
}


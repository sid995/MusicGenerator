"use server";

import { headers } from "next/headers";
import { auth } from "~/lib/auth";
import { db } from "~/server/db";

export async function getCurrentUserPlanAndCredits() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      credits: true,
      plan: true,
    },
  });

  if (!user) return null;

  return {
    credits: user.credits,
    plan: user.plan,
  };
}


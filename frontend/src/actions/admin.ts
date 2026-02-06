"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "~/lib/auth";
import { db } from "~/server/db";

async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth/sign-in");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    redirect("/");
  }
}

export async function listUsersWithCredits() {
  await requireAdmin();

  return db.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      credits: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });
}

export async function setUserCredits(userId: string, credits: number) {
  await requireAdmin();

  await db.user.update({
    where: { id: userId },
    data: { credits },
  });
}

export async function incrementUserCredits(userId: string, amount: number) {
  await requireAdmin();

  await db.user.update({
    where: { id: userId },
    data: {
      credits: {
        increment: amount,
      },
    },
  });
}


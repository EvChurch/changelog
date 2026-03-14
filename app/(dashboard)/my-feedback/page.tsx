import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrCreateUserByPcoId } from "@/lib/user";
import MyFeedbackClient from "./my-feedback-client";

const DEFAULT_DAYS = 90;

export default async function MyFeedbackPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const user = await getOrCreateUserByPcoId(session.user.id, {
    email: session.user.email,
    name: session.user.name,
  });

  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const since = new Date();
  since.setDate(since.getDate() - DEFAULT_DAYS);
  const accepted = await prisma.feedback.findMany({
    where: { status: "accepted", acceptedAt: { gte: since } },
    include: {
      team: { select: { id: true, name: true } },
      createdBy: { select: { name: true, email: true } },
    },
    orderBy: { acceptedAt: "desc" },
  });
  const serialized = accepted.map((f) => ({
    ...f,
    acceptedAt: f.acceptedAt?.toISOString() ?? null,
  }));

  return (
    <div className="min-h-screen">
      <header className="changelog-header">
        <div className="changelog-container flex h-14 items-center justify-between">
          <Link href="/dashboard" className="font-semibold text-zinc-900 dark:text-zinc-100">
            Changelog
          </Link>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {session.user.email}
          </span>
        </div>
      </header>
      <main className="changelog-container py-8">
        <h1 className="changelog-page-title">My team feedback</h1>
        <p className="changelog-page-subtitle">
          Accepted feedback for the last {DEFAULT_DAYS} days. Use “Load older” to see
          more.
        </p>
        <MyFeedbackClient
          initialTeams={teams}
          initialFeedback={serialized}
          defaultDays={DEFAULT_DAYS}
        />
      </main>
    </div>
  );
}

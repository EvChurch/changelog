import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
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
        <h1 className="changelog-page-title">Dashboard</h1>
        <p className="changelog-page-subtitle">
          Submit feedback, review as driver or leader, or view accepted feedback.
        </p>
        <nav className="mt-8 flex flex-wrap gap-3">
          <Link href="/feedback/new" className="changelog-btn-primary">
            Submit feedback
          </Link>
          <Link href="/driver" className="changelog-btn-secondary">
            Driver
          </Link>
          <Link href="/leader" className="changelog-btn-secondary">
            Leader
          </Link>
          <Link href="/my-feedback" className="changelog-btn-secondary">
            My team feedback
          </Link>
        </nav>
      </main>
    </div>
  );
}

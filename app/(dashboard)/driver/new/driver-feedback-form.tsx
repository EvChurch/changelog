"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Team {
  id: string;
  name: string;
}

export default function DriverFeedbackForm() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [teamId, setTeamId] = useState("");

  useEffect(() => {
    fetch("/api/teams")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load teams"))))
      .then(setTeams)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !teamId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), teamId, asDriver: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to submit");
      router.push("/driver");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="mt-6 text-sm text-zinc-500">Loading teams…</p>;

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="team" className="changelog-label">
          Team
        </label>
        <select
          id="team"
          required
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className="changelog-input mt-1.5"
        >
          <option value="">Select a team</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="content" className="changelog-label">
          Feedback
        </label>
        <textarea
          id="content"
          required
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="changelog-input mt-1.5 resize-y"
          placeholder="Describe the feedback…"
        />
      </div>
      <button
        type="submit"
        disabled={submitting || !content.trim() || !teamId}
        className="changelog-btn-primary disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}

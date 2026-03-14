"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DriverActions({ feedbackId }: { feedbackId: string }) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  const submit = async (action: "driver_approve" | "driver_reject") => {
    setLoading(action === "driver_approve" ? "approve" : "reject");
    try {
      const res = await fetch(`/api/feedback/${feedbackId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment: comment.trim() || undefined }),
      });
      if (!res.ok) throw new Error("Request failed");
      router.push("/driver");
      router.refresh();
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mt-8 space-y-5">
      <div>
        <label htmlFor="comment" className="changelog-label">
          Comment (optional)
        </label>
        <textarea
          id="comment"
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="changelog-input mt-1.5 resize-y"
          placeholder="Add a note for the leader or for rejection"
        />
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => submit("driver_approve")}
          disabled={!!loading}
          className="changelog-btn-success disabled:opacity-50"
        >
          {loading === "approve" ? "Sending…" : "Approve (send to leader)"}
        </button>
        <button
          type="button"
          onClick={() => submit("driver_reject")}
          disabled={!!loading}
          className="changelog-btn-secondary disabled:opacity-50"
        >
          {loading === "reject" ? "Sending…" : "Reject / return"}
        </button>
      </div>
    </div>
  );
}

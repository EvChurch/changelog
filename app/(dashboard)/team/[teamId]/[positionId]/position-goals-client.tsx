"use client"

import { useCallback, useEffect, useState } from "react"

interface PersonItem {
  id: string
  fullName: string
  email: string | null
}

interface KeyResultItem {
  id: string
  title: string
  descriptionMarkdown: string | null
  progress: number
}

interface ObjectiveItem {
  id: string
  title: string
  descriptionMarkdown: string | null
  status: "not_started" | "in_progress" | "completed" | "on_hold"
  assigneePersonId: string | null
  assignee: PersonItem | null
  createdBy: PersonItem
  keyResults: KeyResultItem[]
}

export default function PositionGoalsClient({
  positionId,
  canEditGoals,
  teamMembers,
}: {
  positionId: string
  canEditGoals: boolean
  teamMembers: PersonItem[]
}) {
  const [objectives, setObjectives] = useState<ObjectiveItem[]>([])
  const [loadingObjectives, setLoadingObjectives] = useState(true)
  const [objectiveDrafts, setObjectiveDrafts] = useState<
    Record<
      string,
      {
        title: string
        descriptionMarkdown: string
        status: ObjectiveItem["status"]
        assigneePersonId: string
      }
    >
  >({})
  const [keyResultDrafts, setKeyResultDrafts] = useState<
    Record<
      string,
      { title: string; descriptionMarkdown: string; progress: number }
    >
  >({})
  const [newObjectiveDraft, setNewObjectiveDraft] = useState({
    title: "",
    descriptionMarkdown: "",
    status: "not_started" as ObjectiveItem["status"],
    assigneePersonId: "",
  })
  const [newKeyResultDrafts, setNewKeyResultDrafts] = useState<
    Record<
      string,
      { title: string; descriptionMarkdown: string; progress: number }
    >
  >({})
  const [savingObjectiveById, setSavingObjectiveById] = useState<
    Record<string, boolean>
  >({})
  const [savingNewObjective, setSavingNewObjective] = useState(false)
  const [savingKeyResultById, setSavingKeyResultById] = useState<
    Record<string, boolean>
  >({})

  const hydrateDrafts = useCallback((objs: ObjectiveItem[]) => {
    setObjectiveDrafts((prev) => {
      const next = { ...prev }
      for (const o of objs) {
        next[o.id] = {
          title: o.title,
          descriptionMarkdown: o.descriptionMarkdown ?? "",
          status: o.status,
          assigneePersonId: o.assigneePersonId ?? "",
        }
      }
      return next
    })
    setKeyResultDrafts((prev) => {
      const next = { ...prev }
      for (const o of objs) {
        for (const kr of o.keyResults) {
          next[kr.id] = {
            title: kr.title,
            descriptionMarkdown: kr.descriptionMarkdown ?? "",
            progress: kr.progress,
          }
        }
      }
      return next
    })
  }, [])

  const loadObjectives = useCallback(async () => {
    setLoadingObjectives(true)
    try {
      const res = await fetch(`/api/positions/${positionId}/objectives`)
      if (!res.ok) return
      const data: { objectives: ObjectiveItem[] } = await res.json()
      setObjectives(data.objectives ?? [])
      hydrateDrafts(data.objectives ?? [])
    } finally {
      setLoadingObjectives(false)
    }
  }, [positionId, hydrateDrafts])

  useEffect(() => {
    void loadObjectives()
  }, [loadObjectives])

  const createObjective = async () => {
    if (!canEditGoals || !newObjectiveDraft.title.trim()) return
    setSavingNewObjective(true)
    try {
      const res = await fetch(`/api/positions/${positionId}/objectives`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newObjectiveDraft.title.trim(),
          descriptionMarkdown:
            newObjectiveDraft.descriptionMarkdown.trim() || null,
          status: newObjectiveDraft.status,
          assigneePersonId: newObjectiveDraft.assigneePersonId || null,
        }),
      })
      if (!res.ok) return
      const created: ObjectiveItem = await res.json()
      setObjectives((prev) => [created, ...prev])
      hydrateDrafts([created])
      setNewObjectiveDraft({
        title: "",
        descriptionMarkdown: "",
        status: "not_started",
        assigneePersonId: "",
      })
    } finally {
      setSavingNewObjective(false)
    }
  }

  const saveObjective = async (objectiveId: string) => {
    const draft = objectiveDrafts[objectiveId]
    if (!canEditGoals || !draft) return
    setSavingObjectiveById((prev) => ({ ...prev, [objectiveId]: true }))
    try {
      const res = await fetch(`/api/objectives/${objectiveId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title.trim(),
          descriptionMarkdown: draft.descriptionMarkdown.trim() || null,
          status: draft.status,
          assigneePersonId: draft.assigneePersonId || null,
        }),
      })
      if (!res.ok) return
      const updated: ObjectiveItem = await res.json()
      setObjectives((prev) =>
        prev.map((o) => (o.id === updated.id ? updated : o))
      )
      hydrateDrafts([updated])
    } finally {
      setSavingObjectiveById((prev) => ({ ...prev, [objectiveId]: false }))
    }
  }

  const deleteObjective = async (objectiveId: string) => {
    if (!canEditGoals) return
    setSavingObjectiveById((prev) => ({ ...prev, [objectiveId]: true }))
    try {
      const res = await fetch(`/api/objectives/${objectiveId}`, {
        method: "DELETE",
      })
      if (!res.ok) return
      setObjectives((prev) => prev.filter((o) => o.id !== objectiveId))
    } finally {
      setSavingObjectiveById((prev) => ({ ...prev, [objectiveId]: false }))
    }
  }

  const createKeyResult = async (objectiveId: string) => {
    const draft = newKeyResultDrafts[objectiveId]
    if (!canEditGoals || !draft?.title?.trim()) return
    setSavingKeyResultById((prev) => ({ ...prev, [objectiveId]: true }))
    try {
      const res = await fetch(`/api/objectives/${objectiveId}/key-results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title.trim(),
          descriptionMarkdown: draft.descriptionMarkdown.trim() || null,
          progress: draft.progress,
        }),
      })
      if (!res.ok) return
      await loadObjectives()
      setNewKeyResultDrafts((prev) => ({
        ...prev,
        [objectiveId]: { title: "", descriptionMarkdown: "", progress: 0 },
      }))
    } finally {
      setSavingKeyResultById((prev) => ({ ...prev, [objectiveId]: false }))
    }
  }

  const saveKeyResult = async (objectiveId: string, keyResultId: string) => {
    const draft = keyResultDrafts[keyResultId]
    if (!canEditGoals || !draft) return
    setSavingKeyResultById((prev) => ({ ...prev, [keyResultId]: true }))
    try {
      const res = await fetch(`/api/objectives/${objectiveId}/key-results`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyResultId,
          title: draft.title.trim(),
          descriptionMarkdown: draft.descriptionMarkdown.trim() || null,
          progress: draft.progress,
        }),
      })
      if (!res.ok) return
      await loadObjectives()
    } finally {
      setSavingKeyResultById((prev) => ({ ...prev, [keyResultId]: false }))
    }
  }

  const deleteKeyResult = async (objectiveId: string, keyResultId: string) => {
    if (!canEditGoals) return
    setSavingKeyResultById((prev) => ({ ...prev, [keyResultId]: true }))
    try {
      const res = await fetch(`/api/objectives/${objectiveId}/key-results`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyResultId }),
      })
      if (!res.ok) return
      await loadObjectives()
    } finally {
      setSavingKeyResultById((prev) => ({ ...prev, [keyResultId]: false }))
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="changelog-section-title">Role goals (OKRs)</h2>

      {canEditGoals && (
        <div className="changelog-card space-y-3 p-4">
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Add objective
          </h3>
          <input
            value={newObjectiveDraft.title}
            onChange={(e) =>
              setNewObjectiveDraft((prev) => ({
                ...prev,
                title: e.target.value,
              }))
            }
            placeholder="Objective title"
            className="changelog-input"
          />
          <textarea
            rows={3}
            value={newObjectiveDraft.descriptionMarkdown}
            onChange={(e) =>
              setNewObjectiveDraft((prev) => ({
                ...prev,
                descriptionMarkdown: e.target.value,
              }))
            }
            placeholder="Objective details"
            className="changelog-input resize-y"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={newObjectiveDraft.status}
              onChange={(e) =>
                setNewObjectiveDraft((prev) => ({
                  ...prev,
                  status: e.target.value as ObjectiveItem["status"],
                }))
              }
              className="changelog-input"
            >
              <option value="not_started">Not started</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On hold</option>
            </select>
            <select
              value={newObjectiveDraft.assigneePersonId}
              onChange={(e) =>
                setNewObjectiveDraft((prev) => ({
                  ...prev,
                  assigneePersonId: e.target.value,
                }))
              }
              className="changelog-input"
            >
              <option value="">No assignee</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.fullName}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={createObjective}
            disabled={savingNewObjective || !newObjectiveDraft.title.trim()}
            className="changelog-btn-secondary disabled:opacity-50"
          >
            {savingNewObjective ? "Saving..." : "Create objective"}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {loadingObjectives ? (
          <p className="text-sm text-zinc-500">Loading goals...</p>
        ) : objectives.length === 0 ? (
          <p className="text-sm text-zinc-500">No objectives yet.</p>
        ) : (
          objectives.map((objective) => {
            const objectiveDraft = objectiveDrafts[objective.id]
            return (
              <div key={objective.id} className="changelog-card p-4">
                <div className="grid gap-3">
                  <input
                    value={objectiveDraft?.title ?? objective.title}
                    onChange={(e) =>
                      setObjectiveDrafts((prev) => ({
                        ...prev,
                        [objective.id]: {
                          title: e.target.value,
                          descriptionMarkdown:
                            prev[objective.id]?.descriptionMarkdown ??
                            objective.descriptionMarkdown ??
                            "",
                          status:
                            prev[objective.id]?.status ?? objective.status,
                          assigneePersonId:
                            prev[objective.id]?.assigneePersonId ??
                            objective.assigneePersonId ??
                            "",
                        },
                      }))
                    }
                    disabled={!canEditGoals}
                    className="changelog-input disabled:opacity-60"
                  />
                  <textarea
                    rows={3}
                    value={
                      objectiveDraft?.descriptionMarkdown ??
                      objective.descriptionMarkdown ??
                      ""
                    }
                    onChange={(e) =>
                      setObjectiveDrafts((prev) => ({
                        ...prev,
                        [objective.id]: {
                          title: prev[objective.id]?.title ?? objective.title,
                          descriptionMarkdown: e.target.value,
                          status:
                            prev[objective.id]?.status ?? objective.status,
                          assigneePersonId:
                            prev[objective.id]?.assigneePersonId ??
                            objective.assigneePersonId ??
                            "",
                        },
                      }))
                    }
                    disabled={!canEditGoals}
                    className="changelog-input resize-y disabled:opacity-60"
                  />
                  <div className="grid gap-3 md:grid-cols-2">
                    <select
                      value={objectiveDraft?.status ?? objective.status}
                      onChange={(e) =>
                        setObjectiveDrafts((prev) => ({
                          ...prev,
                          [objective.id]: {
                            title: prev[objective.id]?.title ?? objective.title,
                            descriptionMarkdown:
                              prev[objective.id]?.descriptionMarkdown ??
                              objective.descriptionMarkdown ??
                              "",
                            status: e.target.value as ObjectiveItem["status"],
                            assigneePersonId:
                              prev[objective.id]?.assigneePersonId ??
                              objective.assigneePersonId ??
                              "",
                          },
                        }))
                      }
                      disabled={!canEditGoals}
                      className="changelog-input disabled:opacity-60"
                    >
                      <option value="not_started">Not started</option>
                      <option value="in_progress">In progress</option>
                      <option value="completed">Completed</option>
                      <option value="on_hold">On hold</option>
                    </select>
                    <select
                      value={
                        objectiveDraft?.assigneePersonId ??
                        objective.assigneePersonId ??
                        ""
                      }
                      onChange={(e) =>
                        setObjectiveDrafts((prev) => ({
                          ...prev,
                          [objective.id]: {
                            title: prev[objective.id]?.title ?? objective.title,
                            descriptionMarkdown:
                              prev[objective.id]?.descriptionMarkdown ??
                              objective.descriptionMarkdown ??
                              "",
                            status:
                              prev[objective.id]?.status ?? objective.status,
                            assigneePersonId: e.target.value,
                          },
                        }))
                      }
                      disabled={!canEditGoals}
                      className="changelog-input disabled:opacity-60"
                    >
                      <option value="">No assignee</option>
                      {teamMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Created by {objective.createdBy.fullName}
                  </p>
                  {canEditGoals && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => saveObjective(objective.id)}
                        disabled={savingObjectiveById[objective.id]}
                        className="changelog-btn-secondary disabled:opacity-50"
                      >
                        {savingObjectiveById[objective.id]
                          ? "Saving..."
                          : "Save objective"}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteObjective(objective.id)}
                        disabled={savingObjectiveById[objective.id]}
                        className="changelog-btn-secondary disabled:opacity-50"
                      >
                        Delete objective
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                  <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Key results
                  </h4>
                  {objective.keyResults.map((keyResult) => {
                    const keyResultDraft = keyResultDrafts[keyResult.id] ?? {
                      title: keyResult.title,
                      descriptionMarkdown: keyResult.descriptionMarkdown ?? "",
                      progress: keyResult.progress,
                    }
                    return (
                      <div
                        key={keyResult.id}
                        className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                      >
                        <input
                          value={keyResultDraft.title}
                          onChange={(e) =>
                            setKeyResultDrafts((prev) => ({
                              ...prev,
                              [keyResult.id]: {
                                ...keyResultDraft,
                                title: e.target.value,
                              },
                            }))
                          }
                          disabled={!canEditGoals}
                          className="changelog-input"
                        />
                        <textarea
                          rows={2}
                          value={keyResultDraft.descriptionMarkdown}
                          onChange={(e) =>
                            setKeyResultDrafts((prev) => ({
                              ...prev,
                              [keyResult.id]: {
                                ...keyResultDraft,
                                descriptionMarkdown: e.target.value,
                              },
                            }))
                          }
                          disabled={!canEditGoals}
                          className="changelog-input mt-2 resize-y"
                        />
                        <label className="changelog-label mt-2 block">
                          Progress %
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={keyResultDraft.progress}
                          onChange={(e) =>
                            setKeyResultDrafts((prev) => ({
                              ...prev,
                              [keyResult.id]: {
                                ...keyResultDraft,
                                progress: Number(e.target.value),
                              },
                            }))
                          }
                          disabled={!canEditGoals}
                          className="changelog-input mt-1.5"
                        />
                        {canEditGoals && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                saveKeyResult(objective.id, keyResult.id)
                              }
                              disabled={savingKeyResultById[keyResult.id]}
                              className="changelog-btn-secondary disabled:opacity-50"
                            >
                              Save KR
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                deleteKeyResult(objective.id, keyResult.id)
                              }
                              disabled={savingKeyResultById[keyResult.id]}
                              className="changelog-btn-secondary disabled:opacity-50"
                            >
                              Delete KR
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {canEditGoals && (
                    <div className="rounded-lg border border-dashed border-zinc-300 p-3 dark:border-zinc-700">
                      <input
                        value={newKeyResultDrafts[objective.id]?.title ?? ""}
                        onChange={(e) =>
                          setNewKeyResultDrafts((prev) => ({
                            ...prev,
                            [objective.id]: {
                              title: e.target.value,
                              descriptionMarkdown:
                                prev[objective.id]?.descriptionMarkdown ?? "",
                              progress: prev[objective.id]?.progress ?? 0,
                            },
                          }))
                        }
                        placeholder="New key result title"
                        className="changelog-input"
                      />
                      <textarea
                        rows={2}
                        value={
                          newKeyResultDrafts[objective.id]
                            ?.descriptionMarkdown ?? ""
                        }
                        onChange={(e) =>
                          setNewKeyResultDrafts((prev) => ({
                            ...prev,
                            [objective.id]: {
                              title: prev[objective.id]?.title ?? "",
                              descriptionMarkdown: e.target.value,
                              progress: prev[objective.id]?.progress ?? 0,
                            },
                          }))
                        }
                        placeholder="Details"
                        className="changelog-input mt-2 resize-y"
                      />
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={newKeyResultDrafts[objective.id]?.progress ?? 0}
                        onChange={(e) =>
                          setNewKeyResultDrafts((prev) => ({
                            ...prev,
                            [objective.id]: {
                              title: prev[objective.id]?.title ?? "",
                              descriptionMarkdown:
                                prev[objective.id]?.descriptionMarkdown ?? "",
                              progress: Number(e.target.value),
                            },
                          }))
                        }
                        className="changelog-input mt-2"
                      />
                      <button
                        type="button"
                        onClick={() => createKeyResult(objective.id)}
                        disabled={
                          savingKeyResultById[objective.id] ||
                          !(
                            newKeyResultDrafts[objective.id]?.title ?? ""
                          ).trim()
                        }
                        className="changelog-btn-secondary mt-2 disabled:opacity-50"
                      >
                        Add key result
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}

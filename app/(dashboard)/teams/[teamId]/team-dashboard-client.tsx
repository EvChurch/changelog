"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

type FeedbackStatus =
  | "pending_driver_review"
  | "pending_leader_review"
  | "accepted"

interface PersonItem {
  id: string
  fullName: string
  email: string | null
}

interface Roster {
  leaders: PersonItem[]
  positions: Array<{
    id: string
    name: string
    descriptionMarkdown: string | null
    members: PersonItem[]
  }>
}

interface FeedbackItem {
  id: string
  content: string
  status: FeedbackStatus
  source: "driver" | "member"
  leaderComment: string | null
  driverComment: string | null
  createdAt: string
  acceptedAt: string | null
  reviewedByDriverAt: string | null
  team: { id: string; name: string }
  createdBy: { fullName: string; email: string | null }
}

interface DraftState {
  content: string
  comment: string
}

interface TeamMemberDetail {
  person: PersonItem & { image: string | null }
  teamRoles: {
    isLeader: boolean
    positions: string[]
  }
  otherTeams: Array<{ id: string; name: string }>
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

const STATUS_LABEL: Record<FeedbackStatus, string> = {
  pending_driver_review: "Pending driver",
  pending_leader_review: "Pending leader",
  accepted: "Accepted",
}

export default function TeamDashboardClient({
  teamId,
  currentPersonId,
  isLeader,
  defaultDays,
  canEditContent,
  canEditGoals,
  teamDescriptionMarkdown,
  roster,
  initialFeedback,
}: {
  teamId: string
  currentPersonId: string
  isLeader: boolean
  defaultDays: number
  canEditContent: boolean
  canEditGoals: boolean
  teamDescriptionMarkdown: string | null
  roster: Roster
  initialFeedback: FeedbackItem[]
}) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "roles" | "goals" | "feedback" | "members"
  >("overview")
  const [teamDescriptionDraft, setTeamDescriptionDraft] = useState(
    teamDescriptionMarkdown ?? ""
  )
  const [savingTeamDescription, setSavingTeamDescription] = useState(false)

  const [feedback, setFeedback] = useState<FeedbackItem[]>(initialFeedback)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [loadingById, setLoadingById] = useState<Record<string, boolean>>({})
  const [oldestAccepted, setOldestAccepted] = useState<string | null>(
    !isLeader &&
      initialFeedback.length > 0 &&
      initialFeedback[initialFeedback.length - 1]?.acceptedAt
      ? initialFeedback[initialFeedback.length - 1].acceptedAt
      : null
  )

  const [drafts, setDrafts] = useState<Record<string, DraftState>>(() => {
    const next: Record<string, DraftState> = {}
    for (const item of initialFeedback) {
      next[item.id] = {
        content: item.content,
        comment: item.leaderComment ?? "",
      }
    }
    return next
  })

  const visiblePositions = useMemo(
    () => roster.positions.filter((position) => position.members.length > 0),
    [roster.positions]
  )
  const rolePositions = useMemo(
    () =>
      isLeader
        ? visiblePositions
        : visiblePositions.filter((position) =>
            position.members.some((member) => member.id === currentPersonId)
          ),
    [currentPersonId, isLeader, visiblePositions]
  )
  const [selectedRoleId, setSelectedRoleId] = useState<string>(
    rolePositions[0]?.id ?? ""
  )
  const [selectedGoalsRoleId, setSelectedGoalsRoleId] = useState<string>(
    rolePositions[0]?.id ?? ""
  )
  const [roleDescriptionDraft, setRoleDescriptionDraft] = useState<
    Record<string, string>
  >(() =>
    Object.fromEntries(
      visiblePositions.map((position) => [
        position.id,
        position.descriptionMarkdown ?? "",
      ])
    )
  )
  const [savingRoleById, setSavingRoleById] = useState<Record<string, boolean>>(
    {}
  )
  const [objectivesByPosition, setObjectivesByPosition] = useState<
    Record<string, ObjectiveItem[]>
  >({})
  const [loadingObjectives, setLoadingObjectives] = useState(false)
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
  const [keyResultDrafts, setKeyResultDrafts] = useState<
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
  const [membersLoadingId, setMembersLoadingId] = useState<string | null>(null)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [memberDetail, setMemberDetail] = useState<TeamMemberDetail | null>(
    null
  )

  const refreshLeaderList = async () => {
    const params = new URLSearchParams({
      role: "team_leader",
      teamId,
      limit: "50",
    })
    const res = await fetch(`/api/feedback?${params}`)
    if (!res.ok) return
    const latest: FeedbackItem[] = await res.json()
    setFeedback(latest)
    setDrafts((prev) => {
      const next = { ...prev }
      for (const item of latest) {
        next[item.id] ??= {
          content: item.content,
          comment: item.leaderComment ?? "",
        }
      }
      return next
    })
  }

  const saveTeamDescription = async () => {
    if (!canEditContent) return
    setSavingTeamDescription(true)
    try {
      await fetch(`/api/teams/${teamId}/content`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptionMarkdown: teamDescriptionDraft }),
      })
    } finally {
      setSavingTeamDescription(false)
    }
  }

  const saveRoleDescription = async (positionId: string) => {
    if (!canEditContent) return
    setSavingRoleById((prev) => ({ ...prev, [positionId]: true }))
    try {
      await fetch(`/api/positions/${positionId}/content`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descriptionMarkdown: roleDescriptionDraft[positionId] ?? "",
        }),
      })
    } finally {
      setSavingRoleById((prev) => ({ ...prev, [positionId]: false }))
    }
  }

  const hydrateObjectiveDrafts = useCallback((objectives: ObjectiveItem[]) => {
    setObjectiveDrafts((prev) => {
      const next = { ...prev }
      for (const objective of objectives) {
        next[objective.id] = {
          title: objective.title,
          descriptionMarkdown: objective.descriptionMarkdown ?? "",
          status: objective.status,
          assigneePersonId: objective.assigneePersonId ?? "",
        }
      }
      return next
    })
    setKeyResultDrafts((prev) => {
      const next = { ...prev }
      for (const objective of objectives) {
        for (const keyResult of objective.keyResults) {
          next[keyResult.id] = {
            title: keyResult.title,
            descriptionMarkdown: keyResult.descriptionMarkdown ?? "",
            progress: keyResult.progress,
          }
        }
      }
      return next
    })
  }, [])

  const loadObjectives = useCallback(
    async (positionId: string) => {
      if (!positionId) return
      setLoadingObjectives(true)
      try {
        const res = await fetch(`/api/positions/${positionId}/objectives`)
        if (!res.ok) return
        const data: { objectives: ObjectiveItem[] } = await res.json()
        setObjectivesByPosition((prev) => ({
          ...prev,
          [positionId]: data.objectives,
        }))
        hydrateObjectiveDrafts(data.objectives)
      } finally {
        setLoadingObjectives(false)
      }
    },
    [hydrateObjectiveDrafts]
  )

  useEffect(() => {
    if (!selectedRoleId && rolePositions[0]?.id) {
      setSelectedRoleId(rolePositions[0].id)
    }
    if (!selectedGoalsRoleId && rolePositions[0]?.id) {
      setSelectedGoalsRoleId(rolePositions[0].id)
    }
  }, [rolePositions, selectedGoalsRoleId, selectedRoleId])

  useEffect(() => {
    if (!selectedGoalsRoleId) return
    void loadObjectives(selectedGoalsRoleId)
  }, [loadObjectives, selectedGoalsRoleId])

  const objectives = selectedGoalsRoleId
    ? (objectivesByPosition[selectedGoalsRoleId] ?? [])
    : []

  const teamMembers = useMemo(() => {
    const map = new Map<string, PersonItem>()
    for (const leader of roster.leaders) map.set(leader.id, leader)
    for (const position of visiblePositions) {
      for (const member of position.members) {
        map.set(member.id, member)
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.fullName.localeCompare(b.fullName)
    )
  }, [roster.leaders, visiblePositions])

  const createObjective = async () => {
    if (
      !canEditGoals ||
      !selectedGoalsRoleId ||
      !newObjectiveDraft.title.trim()
    )
      return
    setSavingNewObjective(true)
    try {
      const res = await fetch(
        `/api/positions/${selectedGoalsRoleId}/objectives`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newObjectiveDraft.title.trim(),
            descriptionMarkdown:
              newObjectiveDraft.descriptionMarkdown.trim() || null,
            status: newObjectiveDraft.status,
            assigneePersonId: newObjectiveDraft.assigneePersonId || null,
          }),
        }
      )
      if (!res.ok) return
      const created: ObjectiveItem = await res.json()
      setObjectivesByPosition((prev) => ({
        ...prev,
        [selectedGoalsRoleId]: [created, ...(prev[selectedGoalsRoleId] ?? [])],
      }))
      hydrateObjectiveDrafts([created])
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
      if (!selectedGoalsRoleId) return
      setObjectivesByPosition((prev) => ({
        ...prev,
        [selectedGoalsRoleId]: (prev[selectedGoalsRoleId] ?? []).map(
          (objective) => (objective.id === updated.id ? updated : objective)
        ),
      }))
      hydrateObjectiveDrafts([updated])
    } finally {
      setSavingObjectiveById((prev) => ({ ...prev, [objectiveId]: false }))
    }
  }

  const deleteObjective = async (objectiveId: string) => {
    if (!canEditGoals || !selectedGoalsRoleId) return
    setSavingObjectiveById((prev) => ({ ...prev, [objectiveId]: true }))
    try {
      const res = await fetch(`/api/objectives/${objectiveId}`, {
        method: "DELETE",
      })
      if (!res.ok) return
      setObjectivesByPosition((prev) => ({
        ...prev,
        [selectedGoalsRoleId]: (prev[selectedGoalsRoleId] ?? []).filter(
          (objective) => objective.id !== objectiveId
        ),
      }))
    } finally {
      setSavingObjectiveById((prev) => ({ ...prev, [objectiveId]: false }))
    }
  }

  const createKeyResult = async (objectiveId: string) => {
    const draft = newKeyResultDrafts[objectiveId]
    if (!canEditGoals || !draft?.title?.trim() || !selectedGoalsRoleId) return
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
      await loadObjectives(selectedGoalsRoleId)
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
    if (!canEditGoals || !draft || !selectedGoalsRoleId) return
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
      await loadObjectives(selectedGoalsRoleId)
    } finally {
      setSavingKeyResultById((prev) => ({ ...prev, [keyResultId]: false }))
    }
  }

  const deleteKeyResult = async (objectiveId: string, keyResultId: string) => {
    if (!canEditGoals || !selectedGoalsRoleId) return
    setSavingKeyResultById((prev) => ({ ...prev, [keyResultId]: true }))
    try {
      const res = await fetch(`/api/objectives/${objectiveId}/key-results`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyResultId }),
      })
      if (!res.ok) return
      await loadObjectives(selectedGoalsRoleId)
    } finally {
      setSavingKeyResultById((prev) => ({ ...prev, [keyResultId]: false }))
    }
  }

  const loadMember = async (memberId: string) => {
    setMembersLoadingId(memberId)
    setSelectedMemberId(memberId)
    try {
      const res = await fetch(`/api/teams/${teamId}/members/${memberId}`)
      if (!res.ok) return
      const detail: TeamMemberDetail = await res.json()
      setMemberDetail(detail)
    } finally {
      setMembersLoadingId(null)
    }
  }

  const loadOlderMemberFeedback = async () => {
    if (!oldestAccepted || isLeader) return
    setLoadingOlder(true)
    try {
      const params = new URLSearchParams({
        teamId,
        before: oldestAccepted,
        limit: "50",
      })
      const res = await fetch(`/api/feedback?${params}`)
      if (!res.ok) return
      const older: FeedbackItem[] = await res.json()
      setFeedback((prev) => [...prev, ...older])
      if (older.length > 0 && older[older.length - 1]?.acceptedAt) {
        setOldestAccepted(older[older.length - 1].acceptedAt)
      } else {
        setOldestAccepted(null)
      }
    } finally {
      setLoadingOlder(false)
    }
  }

  const setDraft = (id: string, patch: Partial<DraftState>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        content: patch.content ?? prev[id]?.content ?? "",
        comment: patch.comment ?? prev[id]?.comment ?? "",
      },
    }))
  }

  const runLeaderAction = async (
    id: string,
    action: "leader_accept" | "leader_reject" | "leader_edit"
  ) => {
    const draft = drafts[id]
    setLoadingById((prev) => ({ ...prev, [id]: true }))
    try {
      const payload: {
        action: "leader_accept" | "leader_reject" | "leader_edit"
        comment?: string
        content?: string
      } = {
        action,
        comment: draft?.comment.trim() || undefined,
      }
      if (action === "leader_edit") {
        payload.content = draft?.content
      }
      const res = await fetch(`/api/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) return
      await refreshLeaderList()
    } finally {
      setLoadingById((prev) => ({ ...prev, [id]: false }))
    }
  }

  return (
    <div className="mt-8 space-y-4">
      <div className="flex flex-wrap gap-2">
        {[
          { id: "overview", label: "Overview" },
          { id: "roles", label: "Roles" },
          { id: "goals", label: "Goals" },
          { id: "feedback", label: "Feedback" },
          { id: "members", label: "Members" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() =>
              setActiveTab(
                tab.id as
                  | "overview"
                  | "roles"
                  | "goals"
                  | "feedback"
                  | "members"
              )
            }
            className={
              activeTab === tab.id
                ? "changelog-btn-secondary"
                : "rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <section className="changelog-card p-4">
          <h2 className="changelog-section-title">Team description</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Markdown-style content for team purpose and cadence.
          </p>
          <textarea
            rows={10}
            value={teamDescriptionDraft}
            onChange={(e) => setTeamDescriptionDraft(e.target.value)}
            disabled={!canEditContent}
            className="changelog-input mt-3 resize-y disabled:opacity-60"
            placeholder="Describe this team."
          />
          {canEditContent && (
            <button
              type="button"
              onClick={saveTeamDescription}
              disabled={savingTeamDescription}
              className="changelog-btn-secondary mt-3 disabled:opacity-50"
            >
              {savingTeamDescription ? "Saving..." : "Save team description"}
            </button>
          )}
        </section>
      )}

      {activeTab === "roles" && (
        <section className="space-y-4">
          <div className="changelog-card p-4">
            <h2 className="changelog-section-title">Role descriptions</h2>
            {rolePositions.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">
                No visible roles yet.
              </p>
            ) : (
              <>
                <label className="changelog-label mt-3 block">Role</label>
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  className="changelog-input mt-1.5"
                >
                  {rolePositions.map((position) => (
                    <option key={position.id} value={position.id}>
                      {position.name}
                    </option>
                  ))}
                </select>
                <textarea
                  rows={8}
                  value={roleDescriptionDraft[selectedRoleId] ?? ""}
                  onChange={(e) =>
                    setRoleDescriptionDraft((prev) => ({
                      ...prev,
                      [selectedRoleId]: e.target.value,
                    }))
                  }
                  disabled={!canEditContent}
                  className="changelog-input mt-3 resize-y disabled:opacity-60"
                />
                {canEditContent && selectedRoleId && (
                  <button
                    type="button"
                    onClick={() => saveRoleDescription(selectedRoleId)}
                    disabled={savingRoleById[selectedRoleId]}
                    className="changelog-btn-secondary mt-3 disabled:opacity-50"
                  >
                    {savingRoleById[selectedRoleId]
                      ? "Saving..."
                      : "Save role description"}
                  </button>
                )}
              </>
            )}
          </div>
          <div className="changelog-card p-4">
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Team roster by role
            </h3>
            <div className="mt-3 space-y-4">
              {visiblePositions.map((position) => (
                <div key={position.id}>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {position.name}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {position.members.map((member) => (
                      <li
                        key={member.id}
                        className="text-sm text-zinc-600 dark:text-zinc-400"
                      >
                        {member.fullName}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === "goals" && (
        <section className="space-y-4">
          <div className="changelog-card p-4">
            <h2 className="changelog-section-title">Role goals (OKRs)</h2>
            {rolePositions.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">No roles available.</p>
            ) : (
              <>
                <label className="changelog-label mt-3 block">Role</label>
                <select
                  value={selectedGoalsRoleId}
                  onChange={(e) => setSelectedGoalsRoleId(e.target.value)}
                  className="changelog-input mt-1.5"
                >
                  {rolePositions.map((position) => (
                    <option key={position.id} value={position.id}>
                      {position.name}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>

          {canEditGoals && selectedGoalsRoleId && (
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
                              title:
                                prev[objective.id]?.title ?? objective.title,
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
                                title:
                                  prev[objective.id]?.title ?? objective.title,
                                descriptionMarkdown:
                                  prev[objective.id]?.descriptionMarkdown ??
                                  objective.descriptionMarkdown ??
                                  "",
                                status: e.target
                                  .value as ObjectiveItem["status"],
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
                                title:
                                  prev[objective.id]?.title ?? objective.title,
                                descriptionMarkdown:
                                  prev[objective.id]?.descriptionMarkdown ??
                                  objective.descriptionMarkdown ??
                                  "",
                                status:
                                  prev[objective.id]?.status ??
                                  objective.status,
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
                        const keyResultDraft = keyResultDrafts[
                          keyResult.id
                        ] ?? {
                          title: keyResult.title,
                          descriptionMarkdown:
                            keyResult.descriptionMarkdown ?? "",
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
                            value={
                              newKeyResultDrafts[objective.id]?.title ?? ""
                            }
                            onChange={(e) =>
                              setNewKeyResultDrafts((prev) => ({
                                ...prev,
                                [objective.id]: {
                                  title: e.target.value,
                                  descriptionMarkdown:
                                    prev[objective.id]?.descriptionMarkdown ??
                                    "",
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
                            value={
                              newKeyResultDrafts[objective.id]?.progress ?? 0
                            }
                            onChange={(e) =>
                              setNewKeyResultDrafts((prev) => ({
                                ...prev,
                                [objective.id]: {
                                  title: prev[objective.id]?.title ?? "",
                                  descriptionMarkdown:
                                    prev[objective.id]?.descriptionMarkdown ??
                                    "",
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
      )}

      {activeTab === "feedback" && (
        <section>
          <h2 className="changelog-section-title">Feedback</h2>
          {!isLeader && (
            <p className="mt-1 text-sm text-zinc-500">
              Showing accepted feedback from last {defaultDays} days plus your
              pending items.
            </p>
          )}

          {feedback.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">No feedback found.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {feedback.map((item) => {
                const draft = drafts[item.id] ?? {
                  content: item.content,
                  comment: item.leaderComment ?? "",
                }
                return (
                  <li key={item.id} className="changelog-card p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-zinc-500">
                        {STATUS_LABEL[item.status]}
                      </span>
                      <span className="text-xs text-zinc-400">-</span>
                      <span className="text-xs text-zinc-500">
                        {new Date(
                          item.acceptedAt ?? item.createdAt
                        ).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-zinc-400">-</span>
                      <span className="text-xs text-zinc-500">
                        {item.createdBy.fullName}
                      </span>
                    </div>

                    {isLeader ? (
                      <div className="mt-3 space-y-3">
                        <textarea
                          rows={4}
                          value={draft.content}
                          onChange={(e) =>
                            setDraft(item.id, { content: e.target.value })
                          }
                          className="changelog-input resize-y"
                        />
                        <textarea
                          rows={2}
                          value={draft.comment}
                          onChange={(e) =>
                            setDraft(item.id, { comment: e.target.value })
                          }
                          placeholder="Leader note (optional)"
                          className="changelog-input resize-y"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              runLeaderAction(item.id, "leader_edit")
                            }
                            disabled={loadingById[item.id]}
                            className="changelog-btn-secondary disabled:opacity-50"
                          >
                            Save edit
                          </button>
                          {item.status === "pending_leader_review" && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  runLeaderAction(item.id, "leader_accept")
                                }
                                disabled={loadingById[item.id]}
                                className="changelog-btn-success disabled:opacity-50"
                              >
                                Approve for view
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  runLeaderAction(item.id, "leader_reject")
                                }
                                disabled={loadingById[item.id]}
                                className="changelog-btn-secondary disabled:opacity-50"
                              >
                                Return to driver
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="mt-3 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                          {item.content}
                        </p>
                        {item.leaderComment && (
                          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                            Team Leader: {item.leaderComment}
                          </p>
                        )}
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          {!isLeader && oldestAccepted && (
            <button
              type="button"
              onClick={loadOlderMemberFeedback}
              disabled={loadingOlder}
              className="changelog-btn-secondary mt-4 disabled:opacity-50"
            >
              {loadingOlder ? "Loading..." : "Load older"}
            </button>
          )}
        </section>
      )}

      {activeTab === "members" && (
        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="changelog-card p-4">
            <h2 className="changelog-section-title">Team members</h2>
            <ul className="mt-3 space-y-2">
              {teamMembers.map((member) => (
                <li key={member.id}>
                  <button
                    type="button"
                    onClick={() => loadMember(member.id)}
                    className={
                      selectedMemberId === member.id
                        ? "w-full rounded-md border border-zinc-300 bg-zinc-100 px-3 py-2 text-left text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        : "w-full rounded-md border border-zinc-200 px-3 py-2 text-left text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
                    }
                  >
                    {member.fullName}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="changelog-card p-4">
            <h2 className="changelog-section-title">Member details</h2>
            {membersLoadingId ? (
              <p className="mt-2 text-sm text-zinc-500">Loading...</p>
            ) : !memberDetail ? (
              <p className="mt-2 text-sm text-zinc-500">Select a member.</p>
            ) : (
              <div className="mt-3 space-y-3">
                <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                  {memberDetail.person.fullName}
                </p>
                {memberDetail.person.email && (
                  <p className="text-sm text-zinc-500">
                    {memberDetail.person.email}
                  </p>
                )}
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {memberDetail.teamRoles.isLeader
                    ? "Team leader"
                    : "Team member"}
                  {memberDetail.teamRoles.positions.length > 0
                    ? ` - ${memberDetail.teamRoles.positions.join(", ")}`
                    : ""}
                </p>
                <div>
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Other teams
                  </p>
                  {memberDetail.otherTeams.length === 0 ? (
                    <p className="mt-1 text-sm text-zinc-500">
                      No other team assignments.
                    </p>
                  ) : (
                    <ul className="mt-1 list-disc pl-5 text-sm text-zinc-600 dark:text-zinc-400">
                      {memberDetail.otherTeams.map((team) => (
                        <li key={team.id}>{team.name}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

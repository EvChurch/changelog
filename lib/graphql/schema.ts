import SchemaBuilder from "@pothos/core"
import { GraphQLError } from "graphql"

import { Prisma } from "@/generated/prisma/client"
import {
  FeedbackSource,
  FeedbackStatus,
  ObjectiveStatus,
} from "@/generated/prisma/enums"
import {
  canViewTeam,
  isEligibleDriverForTeam,
  isPersonInTeam,
  leaderOrDriverWrite,
  memberOrDriverWrite,
} from "@/lib/permissions"

import type { GraphQLContext } from "./context"
import { prisma } from "./context"

const builder = new SchemaBuilder<{
  Context: GraphQLContext
  DefaultFieldNullability: false
  DefaultInputFieldRequiredness: true
}>({
  defaultFieldNullability: false,
  defaultInputFieldRequiredness: true,
})

function requirePerson(ctx: GraphQLContext) {
  if (!ctx.person) {
    throw new GraphQLError("Unauthorized")
  }
  return ctx.person
}

function badRequest(message: string): never {
  throw new GraphQLError(message)
}

const FeedbackStatusEnum = builder.enumType("FeedbackStatus", {
  values: Object.values(FeedbackStatus),
})

const FeedbackSourceEnum = builder.enumType("FeedbackSource", {
  values: Object.values(FeedbackSource),
})

const ObjectiveStatusEnum = builder.enumType("ObjectiveStatus", {
  values: Object.values(ObjectiveStatus),
})

const FeedbackListRoleEnum = builder.enumType("FeedbackListRole", {
  values: ["driver", "leader", "team_leader"] as const,
})

const FeedbackActionEnum = builder.enumType("FeedbackAction", {
  values: [
    "driver_approve",
    "driver_reject",
    "leader_accept",
    "leader_reject",
    "leader_edit",
  ] as const,
})

const PersonType = builder.objectRef<{
  id: string
  fullName: string
  email: string | null
  image?: string | null
}>("Person")
PersonType.implement({
  fields: (t) => ({
    id: t.exposeString("id"),
    fullName: t.exposeString("fullName"),
    email: t.exposeString("email", { nullable: true }),
    image: t.exposeString("image", { nullable: true }),
  }),
})

const TeamType = builder.objectRef<{
  id: string
  name: string
  descriptionMarkdown?: string | null
}>("Team")
TeamType.implement({
  fields: (t) => ({
    id: t.exposeString("id"),
    name: t.exposeString("name"),
    descriptionMarkdown: t.exposeString("descriptionMarkdown", {
      nullable: true,
    }),
  }),
})

const PositionType = builder.objectRef<{
  id: string
  name: string | null
  teamId?: string
  descriptionMarkdown?: string | null
}>("Position")
PositionType.implement({
  fields: (t) => ({
    id: t.exposeString("id"),
    name: t.string({
      resolve: (parent) => parent.name?.trim() || "Team Member",
    }),
    teamId: t.exposeString("teamId", { nullable: true }),
    descriptionMarkdown: t.exposeString("descriptionMarkdown", {
      nullable: true,
    }),
  }),
})

const TeamWithPositionsType = builder.objectRef<{
  id: string
  name: string
  positions: { id: string; name: string | null }[]
}>("TeamWithPositions")
TeamWithPositionsType.implement({
  fields: (t) => ({
    id: t.exposeString("id"),
    name: t.exposeString("name"),
    positions: t.field({
      type: [PositionType],
      resolve: (parent) => parent.positions,
    }),
  }),
})

const FeedbackType = builder.objectRef<{
  id: string
  content: string
  status: (typeof FeedbackStatus)[keyof typeof FeedbackStatus]
  source: (typeof FeedbackSource)[keyof typeof FeedbackSource]
  leaderComment: string | null
  driverComment: string | null
  createdAt: Date
  acceptedAt: Date | null
  reviewedByDriverAt: Date | null
  team: { id: string; name: string }
  createdBy: { fullName: string; email: string | null }
}>("Feedback")
FeedbackType.implement({
  fields: (t) => ({
    id: t.exposeString("id"),
    content: t.exposeString("content"),
    status: t.expose("status", { type: FeedbackStatusEnum }),
    source: t.expose("source", { type: FeedbackSourceEnum }),
    leaderComment: t.exposeString("leaderComment", { nullable: true }),
    driverComment: t.exposeString("driverComment", { nullable: true }),
    createdAt: t.field({
      type: "String",
      resolve: (parent) => parent.createdAt.toISOString(),
    }),
    acceptedAt: t.field({
      type: "String",
      nullable: true,
      resolve: (parent) => parent.acceptedAt?.toISOString() ?? null,
    }),
    reviewedByDriverAt: t.field({
      type: "String",
      nullable: true,
      resolve: (parent) => parent.reviewedByDriverAt?.toISOString() ?? null,
    }),
    team: t.field({
      type: TeamType,
      resolve: (parent) => parent.team,
    }),
    createdBy: t.field({
      type: PersonType,
      resolve: (parent) => ({
        id: "",
        fullName: parent.createdBy.fullName,
        email: parent.createdBy.email,
      }),
    }),
  }),
})

const KeyResultType = builder.objectRef<{
  id: string
  title: string
  descriptionMarkdown: string | null
  progress: number
}>("KeyResult")
KeyResultType.implement({
  fields: (t) => ({
    id: t.exposeString("id"),
    title: t.exposeString("title"),
    descriptionMarkdown: t.exposeString("descriptionMarkdown", {
      nullable: true,
    }),
    progress: t.exposeInt("progress"),
  }),
})

const ObjectiveType = builder.objectRef<{
  id: string
  title: string
  descriptionMarkdown: string | null
  status: (typeof ObjectiveStatus)[keyof typeof ObjectiveStatus]
  assigneePersonId: string | null
  assignee: { id: string; fullName: string; email: string | null } | null
  createdBy: { id: string; fullName: string; email: string | null }
  keyResults: {
    id: string
    title: string
    descriptionMarkdown: string | null
    progress: number
  }[]
  position?: { id: string; teamId: string; name: string | null }
}>("Objective")
ObjectiveType.implement({
  fields: (t) => ({
    id: t.exposeString("id"),
    title: t.exposeString("title"),
    descriptionMarkdown: t.exposeString("descriptionMarkdown", {
      nullable: true,
    }),
    status: t.expose("status", { type: ObjectiveStatusEnum }),
    assigneePersonId: t.exposeString("assigneePersonId", { nullable: true }),
    assignee: t.field({
      type: PersonType,
      nullable: true,
      resolve: (parent) => parent.assignee,
    }),
    createdBy: t.field({
      type: PersonType,
      resolve: (parent) => parent.createdBy,
    }),
    keyResults: t.field({
      type: [KeyResultType],
      resolve: (parent) => parent.keyResults,
    }),
  }),
})

const PositionObjectivesPayloadType = builder.objectRef<{
  position: { id: string; teamId: string; name: string | null }
  objectives: {
    id: string
    title: string
    descriptionMarkdown: string | null
    status: (typeof ObjectiveStatus)[keyof typeof ObjectiveStatus]
    assigneePersonId: string | null
    assignee: { id: string; fullName: string; email: string | null } | null
    createdBy: { id: string; fullName: string; email: string | null }
    keyResults: {
      id: string
      title: string
      descriptionMarkdown: string | null
      progress: number
    }[]
  }[]
}>("PositionObjectivesPayload")
PositionObjectivesPayloadType.implement({
  fields: (t) => ({
    position: t.field({
      type: PositionType,
      resolve: (parent) => parent.position,
    }),
    objectives: t.field({
      type: [ObjectiveType],
      resolve: (parent) => parent.objectives,
    }),
  }),
})

const TeamRoleInfoType = builder.objectRef<{
  isLeader: boolean
  positions: string[]
}>("TeamRoleInfo")
TeamRoleInfoType.implement({
  fields: (t) => ({
    isLeader: t.exposeBoolean("isLeader"),
    positions: t.exposeStringList("positions"),
  }),
})

const OtherTeamType = builder.objectRef<{
  id: string
  name: string
  serviceTypeName: string | null
}>("OtherTeam")
OtherTeamType.implement({
  fields: (t) => ({
    id: t.exposeString("id"),
    name: t.exposeString("name"),
    serviceTypeName: t.exposeString("serviceTypeName", { nullable: true }),
  }),
})

const MemberDetailType = builder.objectRef<{
  person: {
    id: string
    fullName: string
    email: string | null
    image: string | null
  }
  teamRoles: { isLeader: boolean; positions: string[] }
  otherTeams: { id: string; name: string; serviceTypeName: string | null }[]
}>("MemberDetail")
MemberDetailType.implement({
  fields: (t) => ({
    person: t.field({ type: PersonType, resolve: (parent) => parent.person }),
    teamRoles: t.field({
      type: TeamRoleInfoType,
      resolve: (parent) => parent.teamRoles,
    }),
    otherTeams: t.field({
      type: [OtherTeamType],
      resolve: (parent) => parent.otherTeams,
    }),
  }),
})

const WorkspaceTeamType = builder.objectRef<{
  id: string
  name: string
  serviceTypeName: string | null
  roles: string[]
  isLeader: boolean
  isMember: boolean
  isEligibleDriver: boolean
}>("WorkspaceTeam")
WorkspaceTeamType.implement({
  fields: (t) => ({
    id: t.exposeString("id"),
    name: t.exposeString("name"),
    serviceTypeName: t.exposeString("serviceTypeName", { nullable: true }),
    roles: t.exposeStringList("roles"),
    isLeader: t.exposeBoolean("isLeader"),
    isMember: t.exposeBoolean("isMember"),
    isEligibleDriver: t.exposeBoolean("isEligibleDriver"),
  }),
})

const SimpleMemberType = builder.objectRef<{
  id: string
  fullName: string
  email: string | null
}>("SimpleMember")
SimpleMemberType.implement({
  fields: (t) => ({
    id: t.exposeString("id"),
    fullName: t.exposeString("fullName"),
    email: t.exposeString("email", { nullable: true }),
  }),
})

const TeamPositionRosterType = builder.objectRef<{
  id: string
  name: string
  members: { id: string; fullName: string; email: string | null }[]
}>("TeamPositionRoster")
TeamPositionRosterType.implement({
  fields: (t) => ({
    id: t.exposeString("id"),
    name: t.exposeString("name"),
    members: t.field({
      type: [SimpleMemberType],
      resolve: (parent) => parent.members,
    }),
  }),
})

const TeamRosterType = builder.objectRef<{
  teamId: string
  leaders: { id: string; fullName: string; email: string | null }[]
  positions: {
    id: string
    name: string
    members: { id: string; fullName: string; email: string | null }[]
  }[]
}>("TeamRoster")
TeamRosterType.implement({
  fields: (t) => ({
    teamId: t.exposeString("teamId"),
    leaders: t.field({
      type: [SimpleMemberType],
      resolve: (parent) => parent.leaders,
    }),
    positions: t.field({
      type: [TeamPositionRosterType],
      resolve: (parent) => parent.positions,
    }),
  }),
})

const PositionMembersPayloadType = builder.objectRef<{
  positionId: string
  positionName: string
  members: { id: string; fullName: string; email: string | null }[]
}>("PositionMembersPayload")
PositionMembersPayloadType.implement({
  fields: (t) => ({
    positionId: t.exposeString("positionId"),
    positionName: t.exposeString("positionName"),
    members: t.field({
      type: [SimpleMemberType],
      resolve: (parent) => parent.members,
    }),
  }),
})

const ViewerRoleSummaryType = builder.objectRef<{
  isDriver: boolean
  isLeader: boolean
}>("ViewerRoleSummary")
ViewerRoleSummaryType.implement({
  fields: (t) => ({
    isDriver: t.exposeBoolean("isDriver"),
    isLeader: t.exposeBoolean("isLeader"),
  }),
})

const MutationOkType = builder.objectRef<{ ok: boolean }>("MutationOk")
MutationOkType.implement({
  fields: (t) => ({
    ok: t.exposeBoolean("ok"),
  }),
})

const FeedbackListInput = builder.inputType("FeedbackListInput", {
  fields: (t) => ({
    role: t.field({ type: FeedbackListRoleEnum, required: false }),
    teamId: t.string({ required: false }),
    since: t.string({ required: false }),
    before: t.string({ required: false }),
    includePendingMine: t.boolean({ required: false }),
    limit: t.int({ required: false }),
  }),
})

builder.queryType({
  fields: (t) => ({
    viewerRoleSummary: t.field({
      type: ViewerRoleSummaryType,
      resolve: async (_root, _args, ctx) => {
        const person = requirePerson(ctx)
        const [driver, leader] = await Promise.all([
          prisma.driver.findFirst({
            where: { personId: person.id },
            select: { personId: true },
          }),
          prisma.leader.findFirst({
            where: { personId: person.id },
            select: { personId: true },
          }),
        ])
        return { isDriver: Boolean(driver), isLeader: Boolean(leader) }
      },
    }),
    workspaceTeams: t.field({
      type: [WorkspaceTeamType],
      resolve: async (_root, _args, ctx) => {
        const person = requirePerson(ctx)
        const driverServiceTypes = await prisma.driver.findMany({
          where: { personId: person.id },
          select: { serviceTypeId: true },
        })
        const serviceTypeIds = driverServiceTypes.map((d) => d.serviceTypeId)
        const teams = await prisma.team.findMany({
          where: {
            OR: [
              { leaders: { some: { personId: person.id } } },
              {
                positions: {
                  some: { assignments: { some: { personId: person.id } } },
                },
              },
              ...(serviceTypeIds.length > 0
                ? [{ serviceTypeId: { in: serviceTypeIds } }]
                : []),
            ],
          },
          select: {
            id: true,
            name: true,
            serviceTypeId: true,
            serviceType: { select: { name: true } },
            leaders: {
              where: { personId: person.id },
              select: { personId: true },
            },
            positions: {
              select: {
                name: true,
                assignments: {
                  where: { personId: person.id },
                  select: { personId: true },
                },
              },
            },
          },
          orderBy: { name: "asc" },
        })

        return teams.map((team) => {
          const isLeader = team.leaders.length > 0
          const positionNames = Array.from(
            new Set(
              team.positions
                .filter((position) => position.assignments.length > 0)
                .map((position) => position.name?.trim())
                .filter((name): name is string => Boolean(name))
            )
          ).sort((a, b) => a.localeCompare(b))
          const isMember = team.positions.some(
            (position) => position.assignments.length > 0
          )
          const isEligibleDriver =
            Boolean(team.serviceTypeId) &&
            serviceTypeIds.includes(team.serviceTypeId ?? "")
          const roles: string[] = []
          if (isLeader) roles.push("Team Leader")
          roles.push(...positionNames)
          if (isMember && positionNames.length === 0) roles.push("Team Member")
          if (isEligibleDriver) roles.push("Driver")
          return {
            id: team.id,
            name: team.name,
            serviceTypeName: team.serviceType?.name ?? null,
            roles,
            isLeader,
            isMember,
            isEligibleDriver,
          }
        })
      },
    }),
    teams: t.field({
      type: [TeamType],
      resolve: async (_root, _args, ctx) => {
        const person = requirePerson(ctx)
        const drivers = await prisma.driver.findMany({
          where: { personId: person.id },
          select: { serviceTypeId: true },
        })
        const driverServiceTypeIds = drivers.map(
          (driver) => driver.serviceTypeId
        )
        return prisma.team.findMany({
          where: {
            OR: [
              { leaders: { some: { personId: person.id } } },
              {
                positions: {
                  some: { assignments: { some: { personId: person.id } } },
                },
              },
              ...(driverServiceTypeIds.length > 0
                ? [{ serviceTypeId: { in: driverServiceTypeIds } }]
                : []),
            ],
          },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      },
    }),
    team: t.field({
      type: TeamWithPositionsType,
      args: {
        teamId: t.arg.string({ required: true }),
      },
      resolve: async (_root, args, ctx) => {
        const person = requirePerson(ctx)
        const canAccess = await memberOrDriverWrite(person.id, args.teamId)
        if (!canAccess) {
          throw new GraphQLError("Forbidden")
        }

        const team = await prisma.team.findUnique({
          where: { id: args.teamId },
          select: {
            id: true,
            name: true,
            positions: {
              select: { id: true, name: true },
              orderBy: { name: "asc" },
            },
          },
        })
        if (!team) throw new GraphQLError("Not found")
        return team
      },
    }),
    teamContent: t.field({
      type: TeamType,
      args: {
        teamId: t.arg.string({ required: true }),
      },
      resolve: async (_root, args, ctx) => {
        const person = requirePerson(ctx)
        const [team, canTeamView, canDriverView] = await Promise.all([
          prisma.team.findUnique({
            where: { id: args.teamId },
            select: { id: true, name: true, descriptionMarkdown: true },
          }),
          canViewTeam(person.id, args.teamId),
          isEligibleDriverForTeam(person.id, args.teamId),
        ])
        if (!team) throw new GraphQLError("Not found")
        if (!canTeamView && !canDriverView) throw new GraphQLError("Forbidden")
        return team
      },
    }),
    teamMember: t.field({
      type: MemberDetailType,
      args: {
        teamId: t.arg.string({ required: true }),
        personId: t.arg.string({ required: true }),
      },
      resolve: async (_root, args, ctx) => {
        const requester = requirePerson(ctx)
        const [canTeamView, canDriverView, memberInTeam] = await Promise.all([
          canViewTeam(requester.id, args.teamId),
          isEligibleDriverForTeam(requester.id, args.teamId),
          isPersonInTeam(args.personId, args.teamId),
        ])
        if (!canTeamView && !canDriverView) throw new GraphQLError("Forbidden")
        if (!memberInTeam) throw new GraphQLError("Not found")

        const person = await prisma.person.findUnique({
          where: { id: args.personId },
          select: {
            id: true,
            fullName: true,
            email: true,
            image: true,
            leaders: { where: { teamId: args.teamId }, select: { id: true } },
            assignments: {
              where: { position: { teamId: args.teamId } },
              select: { position: { select: { id: true, name: true } } },
            },
          },
        })
        if (!person) throw new GraphQLError("Not found")

        const [otherLeaderTeams, otherAssignedTeams] = await Promise.all([
          prisma.leader.findMany({
            where: { personId: args.personId, teamId: { not: args.teamId } },
            select: {
              team: {
                select: {
                  id: true,
                  name: true,
                  serviceType: { select: { name: true } },
                },
              },
            },
          }),
          prisma.assignment.findMany({
            where: {
              personId: args.personId,
              position: { teamId: { not: args.teamId } },
            },
            select: {
              position: {
                select: {
                  team: {
                    select: {
                      id: true,
                      name: true,
                      serviceType: { select: { name: true } },
                    },
                  },
                },
              },
            },
          }),
        ])

        const teamsMap = new Map<
          string,
          { id: string; name: string; serviceTypeName: string | null }
        >()
        for (const teamResult of otherLeaderTeams) {
          teamsMap.set(teamResult.team.id, {
            id: teamResult.team.id,
            name: teamResult.team.name,
            serviceTypeName: teamResult.team.serviceType?.name ?? null,
          })
        }
        for (const assignment of otherAssignedTeams) {
          const team = assignment.position.team
          teamsMap.set(team.id, {
            id: team.id,
            name: team.name,
            serviceTypeName: team.serviceType?.name ?? null,
          })
        }

        return {
          person: {
            id: person.id,
            fullName: person.fullName,
            email: person.email,
            image: person.image,
          },
          teamRoles: {
            isLeader: person.leaders.length > 0,
            positions: Array.from(
              new Set(
                person.assignments
                  .map((assignment) => assignment.position.name?.trim())
                  .filter((name): name is string => Boolean(name))
              )
            ).sort((a, b) => a.localeCompare(b)),
          },
          otherTeams: Array.from(teamsMap.values()).sort((a, b) =>
            a.name.localeCompare(b.name)
          ),
        }
      },
    }),
    teamRoster: t.field({
      type: TeamRosterType,
      args: {
        teamId: t.arg.string({ required: true }),
      },
      resolve: async (_root, args, ctx) => {
        const person = requirePerson(ctx)
        const team = await prisma.team.findUnique({
          where: { id: args.teamId },
          select: {
            id: true,
            serviceTypeId: true,
            leaders: {
              include: {
                person: {
                  select: { id: true, fullName: true, email: true },
                },
              },
            },
            positions: {
              include: {
                assignments: {
                  include: {
                    person: {
                      select: { id: true, fullName: true, email: true },
                    },
                  },
                },
              },
              orderBy: { name: "asc" },
            },
          },
        })
        if (!team) throw new GraphQLError("Not found")
        const isLeader = team.leaders.some(
          (leader) => leader.personId === person.id
        )
        const isMember = team.positions.some((position) =>
          position.assignments.some(
            (assignment) => assignment.personId === person.id
          )
        )
        const isDriver = Boolean(
          team.serviceTypeId &&
          (await prisma.driver.findUnique({
            where: {
              personId_serviceTypeId: {
                personId: person.id,
                serviceTypeId: team.serviceTypeId ?? "",
              },
            },
          }))
        )
        if (!isLeader && !isMember && !isDriver)
          throw new GraphQLError("Forbidden")

        return {
          teamId: team.id,
          leaders: team.leaders
            .map((leader) => ({
              id: leader.person.id,
              fullName: leader.person.fullName,
              email: leader.person.email,
            }))
            .sort((a, b) => a.fullName.localeCompare(b.fullName)),
          positions: team.positions.map((position) => ({
            id: position.id,
            name: position.name?.trim() || "Team Member",
            members: position.assignments
              .map((assignment) => ({
                id: assignment.person.id,
                fullName: assignment.person.fullName,
                email: assignment.person.email,
              }))
              .sort((a, b) => a.fullName.localeCompare(b.fullName)),
          })),
        }
      },
    }),
    positionMembers: t.field({
      type: PositionMembersPayloadType,
      args: {
        teamId: t.arg.string({ required: true }),
        positionId: t.arg.string({ required: true }),
      },
      resolve: async (_root, args, ctx) => {
        const person = requirePerson(ctx)
        const position = await prisma.position.findUnique({
          where: { id: args.positionId, teamId: args.teamId },
          select: {
            id: true,
            name: true,
            assignments: {
              include: {
                person: {
                  select: { id: true, fullName: true, email: true },
                },
              },
            },
            team: {
              select: {
                serviceTypeId: true,
                leaders: { select: { personId: true } },
                positions: {
                  select: { assignments: { select: { personId: true } } },
                },
              },
            },
          },
        })
        if (!position) throw new GraphQLError("Not found")
        const isLeader = position.team.leaders.some(
          (leader) => leader.personId === person.id
        )
        const isMember = position.team.positions.some((teamPosition) =>
          teamPosition.assignments.some(
            (assignment) => assignment.personId === person.id
          )
        )
        const isDriver = Boolean(
          position.team.serviceTypeId &&
          (await prisma.driver.findUnique({
            where: {
              personId_serviceTypeId: {
                personId: person.id,
                serviceTypeId: position.team.serviceTypeId ?? "",
              },
            },
          }))
        )
        if (!isLeader && !isMember && !isDriver)
          throw new GraphQLError("Forbidden")
        return {
          positionId: position.id,
          positionName: position.name?.trim() || "Team Member",
          members: position.assignments
            .map((assignment) => ({
              id: assignment.person.id,
              fullName: assignment.person.fullName,
              email: assignment.person.email,
            }))
            .sort((a, b) => a.fullName.localeCompare(b.fullName)),
        }
      },
    }),
    positionContent: t.field({
      type: PositionType,
      args: {
        positionId: t.arg.string({ required: true }),
      },
      resolve: async (_root, args, ctx) => {
        const person = requirePerson(ctx)
        const position = await prisma.position.findUnique({
          where: { id: args.positionId },
          select: {
            id: true,
            name: true,
            teamId: true,
            descriptionMarkdown: true,
          },
        })
        if (!position) throw new GraphQLError("Not found")
        const [canTeamView, canDriverView] = await Promise.all([
          canViewTeam(person.id, position.teamId),
          isEligibleDriverForTeam(person.id, position.teamId),
        ])
        if (!canTeamView && !canDriverView) throw new GraphQLError("Forbidden")
        return position
      },
    }),
    positionObjectives: t.field({
      type: PositionObjectivesPayloadType,
      args: {
        positionId: t.arg.string({ required: true }),
      },
      resolve: async (_root, args, ctx) => {
        const person = requirePerson(ctx)
        const position = await prisma.position.findUnique({
          where: { id: args.positionId },
          select: { id: true, teamId: true, name: true },
        })
        if (!position) throw new GraphQLError("Not found")
        const [canTeamView, canDriverView] = await Promise.all([
          canViewTeam(person.id, position.teamId),
          isEligibleDriverForTeam(person.id, position.teamId),
        ])
        if (!canTeamView && !canDriverView) throw new GraphQLError("Forbidden")

        const objectives = await prisma.objective.findMany({
          where: { positionId: position.id },
          include: {
            assignee: { select: { id: true, fullName: true, email: true } },
            createdBy: { select: { id: true, fullName: true, email: true } },
            keyResults: { orderBy: { createdAt: "asc" } },
          },
          orderBy: { createdAt: "desc" },
        })
        return { position, objectives }
      },
    }),
    feedback: t.field({
      type: FeedbackType,
      args: {
        id: t.arg.string({ required: true }),
      },
      resolve: async (_root, args, ctx) => {
        const person = requirePerson(ctx)
        const feedback = await prisma.feedback.findUnique({
          where: { id: args.id },
          include: {
            team: true,
            createdBy: { select: { fullName: true, email: true } },
          },
        })
        if (!feedback) throw new GraphQLError("Not found")
        const isDriver =
          Boolean(feedback.team.serviceTypeId) &&
          (await prisma.driver.findFirst({
            where: {
              personId: person.id,
              serviceTypeId: feedback.team.serviceTypeId ?? undefined,
            },
          }))
        const isLeader = await prisma.leader.findUnique({
          where: {
            personId_teamId: { personId: person.id, teamId: feedback.teamId },
          },
        })
        const canAccess =
          isDriver ||
          isLeader ||
          feedback.personId === person.id ||
          feedback.status === "accepted"
        if (!canAccess) throw new GraphQLError("Forbidden")
        return {
          ...feedback,
          team: { id: feedback.team.id, name: feedback.team.name },
        }
      },
    }),
    driverFeedback: t.field({
      type: FeedbackType,
      args: {
        id: t.arg.string({ required: true }),
      },
      resolve: async (_root, args, ctx) => {
        const person = requirePerson(ctx)
        const feedback = await prisma.feedback.findUnique({
          where: { id: args.id },
          include: {
            team: { select: { id: true, name: true, serviceTypeId: true } },
            createdBy: { select: { fullName: true, email: true } },
          },
        })
        if (!feedback || feedback.status !== "pending_driver_review") {
          throw new GraphQLError("Not found")
        }
        const isDriver =
          Boolean(feedback.team.serviceTypeId) &&
          (await prisma.driver.findFirst({
            where: {
              personId: person.id,
              serviceTypeId: feedback.team.serviceTypeId ?? undefined,
            },
          }))
        if (!isDriver) throw new GraphQLError("Forbidden")
        return feedback
      },
    }),
    leaderFeedback: t.field({
      type: FeedbackType,
      args: {
        id: t.arg.string({ required: true }),
      },
      resolve: async (_root, args, ctx) => {
        const person = requirePerson(ctx)
        const feedback = await prisma.feedback.findUnique({
          where: { id: args.id },
          include: {
            team: { select: { id: true, name: true } },
            createdBy: { select: { fullName: true, email: true } },
          },
        })
        if (!feedback || feedback.status !== "pending_leader_review") {
          throw new GraphQLError("Not found")
        }
        const canAct = await prisma.leader.findUnique({
          where: {
            personId_teamId: { personId: person.id, teamId: feedback.teamId },
          },
        })
        if (!canAct) throw new GraphQLError("Forbidden")
        return feedback
      },
    }),
    feedbackList: t.field({
      type: [FeedbackType],
      args: {
        input: t.arg({ type: FeedbackListInput, required: true }),
      },
      resolve: async (_root, args, ctx) => {
        const person = requirePerson(ctx)
        const role = args.input.role ?? null
        const teamId = args.input.teamId ?? null
        const since = args.input.since ?? null
        const before = args.input.before ?? null
        const includePendingMine = args.input.includePendingMine === true
        const limit = Math.min(args.input.limit || 50, 100)

        if (role === "driver") {
          const driverServiceTypes = await prisma.driver.findMany({
            where: { personId: person.id },
            select: { serviceTypeId: true },
          })
          const serviceTypeIds = driverServiceTypes.map((d) => d.serviceTypeId)
          if (serviceTypeIds.length === 0) throw new GraphQLError("Forbidden")
          return prisma.feedback.findMany({
            where: {
              status: "pending_driver_review",
              team: { serviceTypeId: { in: serviceTypeIds } },
            },
            include: {
              team: { select: { id: true, name: true } },
              createdBy: { select: { fullName: true, email: true } },
            },
            orderBy: { createdAt: "desc" },
            take: limit,
          })
        }

        if (role === "leader") {
          const leaderTeams = await prisma.leader.findMany({
            where: { personId: person.id },
            select: { teamId: true },
          })
          const teamIds = leaderTeams.map((team) => team.teamId)
          if (teamIds.length === 0) return []
          return prisma.feedback.findMany({
            where: {
              teamId: { in: teamIds },
              status: "pending_leader_review",
            },
            include: {
              team: { select: { id: true, name: true } },
              createdBy: { select: { fullName: true, email: true } },
            },
            orderBy: { createdAt: "desc" },
            take: limit,
          })
        }

        if (role === "team_leader") {
          if (!teamId) badRequest("teamId required")
          const isLeader = await prisma.leader.findUnique({
            where: { personId_teamId: { personId: person.id, teamId } },
          })
          if (!isLeader) throw new GraphQLError("Forbidden")
          return prisma.feedback.findMany({
            where: { teamId },
            include: {
              team: { select: { id: true, name: true } },
              createdBy: { select: { fullName: true, email: true } },
            },
            orderBy: { createdAt: "desc" },
            take: limit,
          })
        }

        if (teamId || since || before) {
          if (teamId && !(await canViewTeam(person.id, teamId))) {
            throw new GraphQLError("Forbidden")
          }
          if (includePendingMine && !teamId) {
            badRequest("includePendingMine requires teamId")
          }

          const where: {
            status: "accepted"
            teamId?: string
            acceptedAt?: { gte?: Date; lte?: Date }
          } = { status: "accepted" }
          if (teamId) where.teamId = teamId
          const sinceDate = since ? new Date(since) : null
          const beforeDate = before ? new Date(before) : null
          if (sinceDate || beforeDate) {
            where.acceptedAt = {}
            if (sinceDate) where.acceptedAt.gte = sinceDate
            if (beforeDate) where.acceptedAt.lte = beforeDate
          }

          if (includePendingMine && teamId) {
            const [accepted, pendingMine] = await Promise.all([
              prisma.feedback.findMany({
                where,
                include: {
                  team: { select: { id: true, name: true } },
                  createdBy: { select: { fullName: true, email: true } },
                },
                orderBy: { acceptedAt: "desc" },
                take: limit,
              }),
              prisma.feedback.findMany({
                where: {
                  teamId,
                  personId: person.id,
                  status: {
                    in: ["pending_driver_review", "pending_leader_review"],
                  },
                },
                include: {
                  team: { select: { id: true, name: true } },
                  createdBy: { select: { fullName: true, email: true } },
                },
                orderBy: { createdAt: "desc" },
                take: limit,
              }),
            ])

            return Array.from(
              new Map(
                [...pendingMine, ...accepted].map((item) => [item.id, item])
              ).values()
            )
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
              .slice(0, limit)
          }

          return prisma.feedback.findMany({
            where,
            include: {
              team: { select: { id: true, name: true } },
              createdBy: { select: { fullName: true, email: true } },
            },
            orderBy: { acceptedAt: "desc" },
            take: limit,
          })
        }

        badRequest("Missing role or teamId/since")
      },
    }),
  }),
})

builder.mutationType({
  fields: (t) => ({
    updateTeamContent: t.field({
      type: TeamType,
      args: {
        teamId: t.arg.string({ required: true }),
        descriptionMarkdown: t.arg.string({ required: false }),
      },
      resolve: async (_root, args, ctx) => {
        const person = requirePerson(ctx)
        const canWrite = await leaderOrDriverWrite(person.id, args.teamId)
        if (!canWrite) throw new GraphQLError("Forbidden")
        return prisma.team.update({
          where: { id: args.teamId },
          data: {
            description: args.descriptionMarkdown
              ? { markdown: args.descriptionMarkdown }
              : Prisma.DbNull,
          },
          select: { id: true, name: true, descriptionMarkdown: true },
        })
      },
    }),
    updatePositionContent: t.field({
      type: PositionType,
      args: {
        positionId: t.arg.string({ required: true }),
        descriptionMarkdown: t.arg.string({ required: false }),
      },
      resolve: async (_root, args, ctx) => {
        const person = requirePerson(ctx)
        const position = await prisma.position.findUnique({
          where: { id: args.positionId },
          select: { id: true, teamId: true },
        })
        if (!position) throw new GraphQLError("Not found")
        const canWrite = await leaderOrDriverWrite(person.id, position.teamId)
        if (!canWrite) throw new GraphQLError("Forbidden")
        return prisma.position.update({
          where: { id: args.positionId },
          data: {
            description: args.descriptionMarkdown
              ? { markdown: args.descriptionMarkdown }
              : Prisma.DbNull,
          },
          select: {
            id: true,
            teamId: true,
            name: true,
            descriptionMarkdown: true,
          },
        })
      },
    }),
    createFeedback: t.field({
      type: FeedbackType,
      args: {
        content: t.arg.string({ required: true }),
        teamId: t.arg.string({ required: true }),
        asDriver: t.arg.boolean({ required: false }),
      },
      resolve: async (_root, args, ctx) => {
        const person = requirePerson(ctx)
        if (!args.content.trim()) badRequest("content required")
        const team = await prisma.team.findUnique({
          where: { id: args.teamId },
          select: { id: true, serviceTypeId: true, name: true },
        })
        if (!team) {
          badRequest("Team not found; use teams query to get valid team ids")
        }
        const isDriverForTeamServiceType =
          Boolean(team.serviceTypeId) &&
          (await prisma.driver.findFirst({
            where: {
              personId: person.id,
              serviceTypeId: team.serviceTypeId ?? undefined,
            },
          }))
        const status =
          args.asDriver && isDriverForTeamServiceType
            ? "pending_leader_review"
            : "pending_driver_review"
        const source =
          args.asDriver && isDriverForTeamServiceType ? "driver" : "member"
        const feedback = await prisma.feedback.create({
          data: {
            teamId: team.id,
            personId: person.id,
            content: args.content.trim(),
            status,
            source,
          },
          include: {
            team: { select: { id: true, name: true } },
            createdBy: { select: { fullName: true, email: true } },
          },
        })
        return feedback
      },
    }),
    feedbackAction: t.field({
      type: MutationOkType,
      args: {
        id: t.arg.string({ required: true }),
        action: t.arg({ type: FeedbackActionEnum, required: true }),
        comment: t.arg.string({ required: false }),
        content: t.arg.string({ required: false }),
      },
      resolve: async (_root, args, ctx) => {
        const person = requirePerson(ctx)
        const feedback = await prisma.feedback.findUnique({
          where: { id: args.id },
          include: { team: { select: { serviceTypeId: true } } },
        })
        if (!feedback) throw new GraphQLError("Not found")

        if (
          args.action === "driver_approve" ||
          args.action === "driver_reject"
        ) {
          const isDriver =
            Boolean(feedback.team.serviceTypeId) &&
            (await prisma.driver.findFirst({
              where: {
                personId: person.id,
                serviceTypeId: feedback.team.serviceTypeId ?? undefined,
              },
            }))
          if (!isDriver) throw new GraphQLError("Forbidden")
          if (feedback.status !== "pending_driver_review") {
            badRequest("Feedback is not pending driver review")
          }
          if (args.action === "driver_approve") {
            await prisma.feedback.update({
              where: { id: args.id },
              data: {
                status: "pending_leader_review",
                driverComment: args.comment ?? null,
                reviewedByDriverAt: new Date(),
              },
            })
          } else {
            await prisma.feedback.update({
              where: { id: args.id },
              data: {
                driverComment: args.comment ?? null,
                reviewedByDriverAt: new Date(),
                status: "pending_driver_review",
              },
            })
          }
          return { ok: true }
        }

        const leader = await prisma.leader.findUnique({
          where: {
            personId_teamId: { personId: person.id, teamId: feedback.teamId },
          },
        })
        if (!leader) throw new GraphQLError("Forbidden")

        if (args.action === "leader_edit") {
          if (typeof args.content !== "string" || !args.content.trim()) {
            badRequest("content required")
          }
          await prisma.feedback.update({
            where: { id: args.id },
            data: {
              content: args.content.trim(),
              leaderComment: args.comment ?? null,
            },
          })
          return { ok: true }
        }

        if (feedback.status !== "pending_leader_review") {
          badRequest("Feedback is not pending leader review")
        }

        if (args.action === "leader_accept") {
          await prisma.feedback.update({
            where: { id: args.id },
            data: {
              status: "accepted",
              leaderComment: args.comment ?? null,
              acceptedAt: new Date(),
            },
          })
          return { ok: true }
        }

        if (args.action === "leader_reject") {
          await prisma.feedback.update({
            where: { id: args.id },
            data: {
              status: "pending_driver_review",
              leaderComment: args.comment ?? null,
              acceptedAt: null,
            },
          })
          return { ok: true }
        }

        badRequest("Invalid action")
      },
    }),
    createObjective: t.field({
      type: ObjectiveType,
      args: {
        positionId: t.arg.string({ required: true }),
        title: t.arg.string({ required: true }),
        descriptionMarkdown: t.arg.string({ required: false }),
        status: t.arg({ type: ObjectiveStatusEnum, required: false }),
        assigneePersonId: t.arg.string({ required: false }),
      },
      resolve: async (_root, args, ctx) => {
        const person = requirePerson(ctx)
        const position = await prisma.position.findUnique({
          where: { id: args.positionId },
          select: { id: true, teamId: true },
        })
        if (!position) throw new GraphQLError("Not found")
        const canWrite = await memberOrDriverWrite(person.id, position.teamId)
        if (!canWrite) throw new GraphQLError("Forbidden")
        if (!args.title.trim()) badRequest("title required")
        if (args.assigneePersonId) {
          const assigneeInTeam = await isPersonInTeam(
            args.assigneePersonId,
            position.teamId
          )
          if (!assigneeInTeam) badRequest("Assignee must be in this team")
        }
        return prisma.objective.create({
          data: {
            positionId: position.id,
            title: args.title.trim(),
            descriptionMarkdown: args.descriptionMarkdown ?? null,
            status: args.status ?? "not_started",
            createdByPersonId: person.id,
            assigneePersonId: args.assigneePersonId ?? null,
          },
          include: {
            assignee: { select: { id: true, fullName: true, email: true } },
            createdBy: { select: { id: true, fullName: true, email: true } },
            keyResults: true,
          },
        })
      },
    }),
    updateObjective: t.field({
      type: ObjectiveType,
      args: {
        objectiveId: t.arg.string({ required: true }),
        title: t.arg.string({ required: false }),
        descriptionMarkdown: t.arg.string({ required: false }),
        status: t.arg({ type: ObjectiveStatusEnum, required: false }),
        assigneePersonId: t.arg.string({ required: false }),
      },
      resolve: async (_root, args, ctx) => {
        const person = requirePerson(ctx)
        const objective = await prisma.objective.findUnique({
          where: { id: args.objectiveId },
          include: { position: { select: { teamId: true } } },
        })
        if (!objective) throw new GraphQLError("Not found")
        const canWrite = await memberOrDriverWrite(
          person.id,
          objective.position.teamId
        )
        if (!canWrite) throw new GraphQLError("Forbidden")
        if (args.assigneePersonId) {
          const assigneeInTeam = await isPersonInTeam(
            args.assigneePersonId,
            objective.position.teamId
          )
          if (!assigneeInTeam) badRequest("Assignee must be in this team")
        }
        return prisma.objective.update({
          where: { id: args.objectiveId },
          data: {
            title: args.title?.trim(),
            descriptionMarkdown:
              args.descriptionMarkdown === undefined
                ? undefined
                : (args.descriptionMarkdown ?? null),
            status: args.status ?? undefined,
            assigneePersonId:
              args.assigneePersonId === undefined
                ? undefined
                : (args.assigneePersonId ?? null),
          },
          include: {
            assignee: { select: { id: true, fullName: true, email: true } },
            createdBy: { select: { id: true, fullName: true, email: true } },
            keyResults: { orderBy: { createdAt: "asc" } },
            position: { select: { id: true, teamId: true, name: true } },
          },
        })
      },
    }),
    deleteObjective: t.field({
      type: MutationOkType,
      args: {
        objectiveId: t.arg.string({ required: true }),
      },
      resolve: async (_root, args, ctx) => {
        const person = requirePerson(ctx)
        const objective = await prisma.objective.findUnique({
          where: { id: args.objectiveId },
          include: { position: { select: { teamId: true } } },
        })
        if (!objective) throw new GraphQLError("Not found")
        const canWrite = await memberOrDriverWrite(
          person.id,
          objective.position.teamId
        )
        if (!canWrite) throw new GraphQLError("Forbidden")
        await prisma.objective.delete({ where: { id: args.objectiveId } })
        return { ok: true }
      },
    }),
    createKeyResult: t.field({
      type: KeyResultType,
      args: {
        objectiveId: t.arg.string({ required: true }),
        title: t.arg.string({ required: true }),
        descriptionMarkdown: t.arg.string({ required: false }),
        progress: t.arg.int({ required: false }),
      },
      resolve: async (_root, args, ctx) => {
        const person = requirePerson(ctx)
        const objective = await prisma.objective.findUnique({
          where: { id: args.objectiveId },
          select: { id: true, position: { select: { teamId: true } } },
        })
        if (!objective) throw new GraphQLError("Not found")
        const canWrite = await memberOrDriverWrite(
          person.id,
          objective.position.teamId
        )
        if (!canWrite) throw new GraphQLError("Forbidden")
        if (!args.title.trim()) badRequest("title required")
        return prisma.keyResult.create({
          data: {
            objectiveId: args.objectiveId,
            title: args.title.trim(),
            descriptionMarkdown: args.descriptionMarkdown ?? null,
            progress:
              typeof args.progress === "number"
                ? Math.max(0, Math.min(100, args.progress))
                : 0,
          },
        })
      },
    }),
    updateKeyResult: t.field({
      type: KeyResultType,
      args: {
        objectiveId: t.arg.string({ required: true }),
        keyResultId: t.arg.string({ required: true }),
        title: t.arg.string({ required: false }),
        descriptionMarkdown: t.arg.string({ required: false }),
        progress: t.arg.int({ required: false }),
      },
      resolve: async (_root, args, ctx) => {
        const person = requirePerson(ctx)
        const objective = await prisma.objective.findUnique({
          where: { id: args.objectiveId },
          select: { id: true, position: { select: { teamId: true } } },
        })
        if (!objective) throw new GraphQLError("Not found")
        const canWrite = await memberOrDriverWrite(
          person.id,
          objective.position.teamId
        )
        if (!canWrite) throw new GraphQLError("Forbidden")
        const keyResult = await prisma.keyResult.findUnique({
          where: { id: args.keyResultId },
          select: { id: true, objectiveId: true },
        })
        if (!keyResult || keyResult.objectiveId !== args.objectiveId) {
          throw new GraphQLError("Not found")
        }
        return prisma.keyResult.update({
          where: { id: args.keyResultId },
          data: {
            title: args.title?.trim(),
            descriptionMarkdown:
              args.descriptionMarkdown === undefined
                ? undefined
                : (args.descriptionMarkdown ?? null),
            progress:
              typeof args.progress === "number"
                ? Math.max(0, Math.min(100, args.progress))
                : undefined,
          },
        })
      },
    }),
    deleteKeyResult: t.field({
      type: MutationOkType,
      args: {
        objectiveId: t.arg.string({ required: true }),
        keyResultId: t.arg.string({ required: true }),
      },
      resolve: async (_root, args, ctx) => {
        const person = requirePerson(ctx)
        const objective = await prisma.objective.findUnique({
          where: { id: args.objectiveId },
          select: { id: true, position: { select: { teamId: true } } },
        })
        if (!objective) throw new GraphQLError("Not found")
        const canWrite = await memberOrDriverWrite(
          person.id,
          objective.position.teamId
        )
        if (!canWrite) throw new GraphQLError("Forbidden")
        const keyResult = await prisma.keyResult.findUnique({
          where: { id: args.keyResultId },
          select: { id: true, objectiveId: true },
        })
        if (!keyResult || keyResult.objectiveId !== args.objectiveId) {
          throw new GraphQLError("Not found")
        }
        await prisma.keyResult.delete({ where: { id: args.keyResultId } })
        return { ok: true }
      },
    }),
  }),
})

export const schema = builder.toSchema({})

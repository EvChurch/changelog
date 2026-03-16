import { graphql } from "@/lib/graphql/gql"

export const TeamsQuery = graphql(`
  query TeamsQuery {
    teams {
      id
      name
    }
  }
`)

export const TeamQuery = graphql(`
  query TeamQuery($teamId: String!) {
    team(teamId: $teamId) {
      id
      name
      positions {
        id
        name
      }
    }
  }
`)

export const TeamContentQuery = graphql(`
  query TeamContentQuery($teamId: String!) {
    teamContent(teamId: $teamId) {
      id
      name
      descriptionMarkdown
    }
  }
`)

export const UpdateTeamContentMutation = graphql(`
  mutation UpdateTeamContentMutation(
    $teamId: String!
    $descriptionMarkdown: String
  ) {
    updateTeamContent(
      teamId: $teamId
      descriptionMarkdown: $descriptionMarkdown
    ) {
      id
      descriptionMarkdown
    }
  }
`)

export const TeamMemberQuery = graphql(`
  query TeamMemberQuery($teamId: String!, $personId: String!) {
    teamMember(teamId: $teamId, personId: $personId) {
      person {
        id
        fullName
        email
        image
      }
      teamRoles {
        isLeader
        positions
      }
      otherTeams {
        id
        name
        serviceTypeName
      }
    }
  }
`)

export const PositionContentQuery = graphql(`
  query PositionContentQuery($positionId: String!) {
    positionContent(positionId: $positionId) {
      id
      name
      teamId
      descriptionMarkdown
    }
  }
`)

export const UpdatePositionContentMutation = graphql(`
  mutation UpdatePositionContentMutation(
    $positionId: String!
    $descriptionMarkdown: String
  ) {
    updatePositionContent(
      positionId: $positionId
      descriptionMarkdown: $descriptionMarkdown
    ) {
      id
      descriptionMarkdown
    }
  }
`)

export const PositionObjectivesQuery = graphql(`
  query PositionObjectivesQuery($positionId: String!) {
    positionObjectives(positionId: $positionId) {
      position {
        id
        teamId
        name
      }
      objectives {
        id
        title
        descriptionMarkdown
        status
        assigneePersonId
        assignee {
          id
          fullName
          email
        }
        createdBy {
          id
          fullName
          email
        }
        keyResults {
          id
          title
          descriptionMarkdown
          progress
        }
      }
    }
  }
`)

export const CreateObjectiveMutation = graphql(`
  mutation CreateObjectiveMutation(
    $positionId: String!
    $title: String!
    $descriptionMarkdown: String
    $status: ObjectiveStatus
    $assigneePersonId: String
  ) {
    createObjective(
      positionId: $positionId
      title: $title
      descriptionMarkdown: $descriptionMarkdown
      status: $status
      assigneePersonId: $assigneePersonId
    ) {
      id
      title
      descriptionMarkdown
      status
      assigneePersonId
      assignee {
        id
        fullName
        email
      }
      createdBy {
        id
        fullName
        email
      }
      keyResults {
        id
        title
        descriptionMarkdown
        progress
      }
    }
  }
`)

export const UpdateObjectiveMutation = graphql(`
  mutation UpdateObjectiveMutation(
    $objectiveId: String!
    $title: String
    $descriptionMarkdown: String
    $status: ObjectiveStatus
    $assigneePersonId: String
  ) {
    updateObjective(
      objectiveId: $objectiveId
      title: $title
      descriptionMarkdown: $descriptionMarkdown
      status: $status
      assigneePersonId: $assigneePersonId
    ) {
      id
      title
      descriptionMarkdown
      status
      assigneePersonId
      assignee {
        id
        fullName
        email
      }
      createdBy {
        id
        fullName
        email
      }
      keyResults {
        id
        title
        descriptionMarkdown
        progress
      }
    }
  }
`)

export const DeleteObjectiveMutation = graphql(`
  mutation DeleteObjectiveMutation($objectiveId: String!) {
    deleteObjective(objectiveId: $objectiveId) {
      ok
    }
  }
`)

export const CreateKeyResultMutation = graphql(`
  mutation CreateKeyResultMutation(
    $objectiveId: String!
    $title: String!
    $descriptionMarkdown: String
    $progress: Int
  ) {
    createKeyResult(
      objectiveId: $objectiveId
      title: $title
      descriptionMarkdown: $descriptionMarkdown
      progress: $progress
    ) {
      id
      title
      descriptionMarkdown
      progress
    }
  }
`)

export const UpdateKeyResultMutation = graphql(`
  mutation UpdateKeyResultMutation(
    $objectiveId: String!
    $keyResultId: String!
    $title: String
    $descriptionMarkdown: String
    $progress: Int
  ) {
    updateKeyResult(
      objectiveId: $objectiveId
      keyResultId: $keyResultId
      title: $title
      descriptionMarkdown: $descriptionMarkdown
      progress: $progress
    ) {
      id
      title
      descriptionMarkdown
      progress
    }
  }
`)

export const DeleteKeyResultMutation = graphql(`
  mutation DeleteKeyResultMutation(
    $objectiveId: String!
    $keyResultId: String!
  ) {
    deleteKeyResult(objectiveId: $objectiveId, keyResultId: $keyResultId) {
      ok
    }
  }
`)

export const FeedbackListQuery = graphql(`
  query FeedbackListQuery($input: FeedbackListInput!) {
    feedbackList(input: $input) {
      id
      content
      status
      source
      leaderComment
      driverComment
      createdAt
      acceptedAt
      reviewedByDriverAt
      team {
        id
        name
      }
      createdBy {
        fullName
        email
      }
    }
  }
`)

export const FeedbackQuery = graphql(`
  query FeedbackQuery($id: String!) {
    feedback(id: $id) {
      id
      content
      status
      source
      leaderComment
      driverComment
      createdAt
      acceptedAt
      reviewedByDriverAt
      team {
        id
        name
      }
      createdBy {
        fullName
        email
      }
    }
  }
`)

export const FeedbackActionMutation = graphql(`
  mutation FeedbackActionMutation(
    $id: String!
    $action: FeedbackAction!
    $comment: String
    $content: String
  ) {
    feedbackAction(
      id: $id
      action: $action
      comment: $comment
      content: $content
    ) {
      ok
    }
  }
`)

export const CreateFeedbackMutation = graphql(`
  mutation CreateFeedbackMutation(
    $content: String!
    $teamId: String!
    $asDriver: Boolean
  ) {
    createFeedback(content: $content, teamId: $teamId, asDriver: $asDriver) {
      id
    }
  }
`)

export const ViewerRoleSummaryQuery = graphql(`
  query ViewerRoleSummaryQuery {
    viewerRoleSummary {
      isDriver
      isLeader
    }
  }
`)

export const WorkspaceTeamsQuery = graphql(`
  query WorkspaceTeamsQuery {
    workspaceTeams {
      id
      name
      serviceTypeName
      roles
      isLeader
      isMember
      isEligibleDriver
    }
  }
`)

export const TeamRosterQuery = graphql(`
  query TeamRosterQuery($teamId: String!) {
    teamRoster(teamId: $teamId) {
      teamId
      leaders {
        id
        fullName
        email
      }
      positions {
        id
        name
        members {
          id
          fullName
          email
        }
      }
    }
  }
`)

export const PositionMembersQuery = graphql(`
  query PositionMembersQuery($teamId: String!, $positionId: String!) {
    positionMembers(teamId: $teamId, positionId: $positionId) {
      positionId
      positionName
      members {
        id
        fullName
        email
      }
    }
  }
`)

export const DriverFeedbackQuery = graphql(`
  query DriverFeedbackQuery($id: String!) {
    driverFeedback(id: $id) {
      id
      content
      status
      team {
        id
        name
      }
      createdBy {
        fullName
        email
      }
    }
  }
`)

export const LeaderFeedbackQuery = graphql(`
  query LeaderFeedbackQuery($id: String!) {
    leaderFeedback(id: $id) {
      id
      content
      status
      driverComment
      team {
        id
        name
      }
      createdBy {
        fullName
        email
      }
    }
  }
`)

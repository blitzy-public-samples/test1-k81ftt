import { gql } from 'graphql-tag'; // v2.12.0
import { GraphQLScalarType } from 'graphql'; // v16.8.0
import { ITask, TaskStatus, TaskPriority } from '../../interfaces/ITask';

/**
 * Custom scalar for DateTime handling with ISO format
 */
const DateTime = new GraphQLScalarType({
  name: 'DateTime',
  description: 'ISO-8601 formatted datetime scalar type',
  serialize: (value: Date) => value.toISOString(),
  parseValue: (value: string) => new Date(value),
  parseLiteral: (ast: any) => ast.kind === 'StringValue' ? new Date(ast.value) : null,
});

/**
 * Custom scalar for JSON metadata
 */
const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON object scalar type',
  serialize: (value: any) => value,
  parseValue: (value: any) => value,
  parseLiteral: (ast: any) => ast.value,
});

/**
 * GraphQL schema definitions for task management system
 * Includes types, queries, mutations, and subscriptions with real-time capabilities
 */
export const taskTypeDefs = gql`
  # Scalar definitions
  scalar DateTime
  scalar JSON

  # Enums
  enum TaskStatus {
    TODO
    IN_PROGRESS
    IN_REVIEW
    BLOCKED
    COMPLETED
  }

  enum TaskPriority {
    LOW
    MEDIUM
    HIGH
    URGENT
  }

  enum TaskSortField {
    DUE_DATE
    PRIORITY
    STATUS
    CREATED_AT
    UPDATED_AT
    TITLE
  }

  # Input types
  input DateRange {
    start: DateTime!
    end: DateTime!
  }

  input TaskSort {
    field: TaskSortField!
    direction: String!
  }

  input TaskInput {
    title: String!
    description: String
    projectId: ID!
    assigneeId: ID!
    status: TaskStatus!
    priority: TaskPriority!
    dueDate: DateTime!
    estimatedHours: Float
    dependencies: [ID!]
    tags: [String!]
    metadata: JSON
  }

  input TaskUpdateInput {
    title: String
    description: String
    assigneeId: ID
    status: TaskStatus
    priority: TaskPriority
    dueDate: DateTime
    estimatedHours: Float
    dependencies: [ID!]
    tags: [String!]
    metadata: JSON
  }

  # Types
  type Task {
    id: ID!
    title: String!
    description: String
    projectId: ID!
    project: Project!
    assigneeId: ID!
    assignee: User!
    creatorId: ID!
    creator: User!
    status: TaskStatus!
    priority: TaskPriority!
    dueDate: DateTime!
    startDate: DateTime
    completedAt: DateTime
    estimatedHours: Float
    actualHours: Float
    dependencies: [ID!]!
    dependencyTasks: [Task!]!
    tags: [String!]!
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
    commentCount: Int!
    attachmentCount: Int!
    completionPercentage: Float!
    isOverdue: Boolean!
    blockedBy: [Task!]!
    blocking: [Task!]!
  }

  type TaskConnection {
    edges: [TaskEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type TaskEdge {
    cursor: String!
    node: Task!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  type TaskPayload {
    success: Boolean!
    task: Task
    errors: [Error!]
  }

  type TaskUpdatePayload {
    changeType: String!
    task: Task!
    timestamp: DateTime!
  }

  type Error {
    code: String!
    message: String!
    field: String
  }

  # Queries
  type Query {
    tasks(
      projectId: ID
      assigneeId: ID
      statuses: [TaskStatus!]
      priorities: [TaskPriority!]
      dueDateRange: DateRange
      searchTerm: String
      tags: [String!]
      includeCompleted: Boolean
      sortBy: TaskSort
      first: Int
      after: String
      last: Int
      before: String
    ): TaskConnection!

    task(id: ID!): Task

    tasksByDependency(dependencyId: ID!): [Task!]!

    taskStats(projectId: ID!): TaskStatistics!
  }

  # Mutations
  type Mutation {
    createTask(input: TaskInput!, optimisticId: ID): TaskPayload!
    
    updateTask(id: ID!, input: TaskUpdateInput!): TaskPayload!
    
    deleteTask(id: ID!): TaskPayload!
    
    updateTaskStatus(id: ID!, status: TaskStatus!): TaskPayload!
    
    updateTaskAssignee(id: ID!, assigneeId: ID!): TaskPayload!
    
    addTaskDependency(taskId: ID!, dependencyId: ID!): TaskPayload!
    
    removeTaskDependency(taskId: ID!, dependencyId: ID!): TaskPayload!
  }

  # Subscriptions
  type Subscription {
    taskUpdated(
      projectId: ID
      statusFilter: [TaskStatus!]
      assigneeId: ID
    ): TaskUpdatePayload!

    taskCreated(projectId: ID): Task!
    
    taskDeleted(projectId: ID): ID!
    
    taskStatusChanged(
      projectId: ID
      assigneeId: ID
    ): TaskUpdatePayload!
  }

  # Additional Types
  type TaskStatistics {
    totalTasks: Int!
    completedTasks: Int!
    overdueTasks: Int!
    upcomingTasks: Int!
    statusBreakdown: [StatusCount!]!
    priorityBreakdown: [PriorityCount!]!
  }

  type StatusCount {
    status: TaskStatus!
    count: Int!
  }

  type PriorityCount {
    priority: TaskPriority!
    count: Int!
  }
`;

export default taskTypeDefs;
/**
 * @fileoverview GraphQL schema definitions for Project type, inputs, queries, and mutations
 * in the task management system with enhanced timeline management and metadata support.
 * @version 1.0.0
 */

import { gql } from 'graphql-tag'; // v2.12.0
import { GraphQLJSON } from 'graphql-type-json'; // v0.3.2
import { IProject, ProjectStatus } from '../../interfaces/IProject';
import { SortOrder } from '../../types/common.types';

/**
 * GraphQL schema definition for the Project module including types,
 * inputs, queries, and mutations with enhanced filtering and pagination support.
 */
export const projectSchema = gql`
  # Scalar type for JSON data (metadata and settings)
  scalar JSON

  # Scalar type for DateTime with timezone support
  scalar DateTime

  # Enum for project status values
  enum ProjectStatus {
    PLANNING
    IN_PROGRESS
    ON_HOLD
    COMPLETED
    CANCELLED
  }

  # Enum for project sorting options
  enum ProjectSortField {
    NAME
    START_DATE
    END_DATE
    STATUS
    CREATED_AT
    UPDATED_AT
  }

  # Input type for date range filtering
  input DateRangeInput {
    startDate: DateTime!
    endDate: DateTime
  }

  # Input type for project sorting
  input ProjectSortInput {
    field: ProjectSortField!
    order: SortOrder!
  }

  # Input type for pagination
  input PaginationInput {
    page: Int! = 1
    limit: Int! = 20
  }

  # Input type for project creation
  input CreateProjectInput {
    name: String!
    description: String
    ownerId: ID!
    status: ProjectStatus! = PLANNING
    startDate: DateTime!
    endDate: DateTime
    settings: JSON
    metadata: JSON
  }

  # Input type for project updates
  input UpdateProjectInput {
    name: String
    description: String
    ownerId: ID
    status: ProjectStatus
    startDate: DateTime
    endDate: DateTime
    settings: JSON
    metadata: JSON
  }

  # Project type definition
  type Project {
    id: ID!
    name: String!
    description: String
    ownerId: ID!
    status: ProjectStatus!
    startDate: DateTime!
    endDate: DateTime
    settings: JSON
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
    
    # Computed fields
    owner: User!
    tasks: [Task!]!
    taskCount: Int!
    completionPercentage: Float!
    isOverdue: Boolean!
  }

  # Project pagination type
  type ProjectConnection {
    nodes: [Project!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  # Page information type
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  # Project queries
  type Query {
    """
    Fetch a single project by ID
    """
    project(id: ID!): Project

    """
    Fetch a list of projects with enhanced filtering and pagination
    """
    projects(
      status: ProjectStatus
      ownerId: ID
      dateRange: DateRangeInput
      sort: ProjectSortInput
      pagination: PaginationInput
    ): ProjectConnection!

    """
    Search projects by name or description
    """
    searchProjects(
      query: String!
      pagination: PaginationInput
    ): ProjectConnection!
  }

  # Project mutations
  type Mutation {
    """
    Create a new project with configuration
    """
    createProject(input: CreateProjectInput!): Project!

    """
    Update an existing project with validation
    """
    updateProject(id: ID!, input: UpdateProjectInput!): Project!

    """
    Delete a project with cascade options
    """
    deleteProject(id: ID!): Boolean!

    """
    Archive a project
    """
    archiveProject(id: ID!): Project!

    """
    Restore an archived project
    """
    restoreProject(id: ID!): Project!

    """
    Update project settings
    """
    updateProjectSettings(id: ID!, settings: JSON!): Project!
  }
`;

/**
 * Export the project schema for use in the GraphQL server configuration
 */
export default projectSchema;
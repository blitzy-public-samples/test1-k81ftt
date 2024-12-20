/**
 * GraphQL User Schema Definition
 * Version: 1.0.0
 * 
 * Enterprise-grade GraphQL schema for user management with comprehensive security,
 * authentication, authorization, and compliance features.
 * 
 * @package TaskManagement
 * @subpackage GraphQL
 */

import { gql } from 'graphql-tag'; // v2.12.6
import { IUser } from '../../interfaces/IUser';
import { UserRole } from '../../types/auth.types';

/**
 * GraphQL schema definitions for user-related types, queries, and mutations.
 * Implements enterprise security features, RBAC, and compliance requirements.
 */
export const userTypeDefs = gql`
  """
  Scalar type for DateTime handling
  """
  scalar DateTime

  """
  Core User type with enhanced security and audit fields
  """
  type User {
    id: ID!
    email: String! @auth(requires: [ADMIN, MANAGER])
    firstName: String!
    lastName: String!
    role: UserRole!
    isActive: Boolean!
    mfaEnabled: Boolean! @auth(requires: [ADMIN])
    lastLoginAt: DateTime
    securitySettings: UserSecuritySettings! @auth(requires: [ADMIN, SELF])
    preferences: UserPreferences!
    createdAt: DateTime!
    updatedAt: DateTime!
    lastAuditAt: DateTime @auth(requires: [ADMIN])
    organizationId: String! @auth(requires: [ADMIN])
    teams: [String!]! @auth(requires: [ADMIN, MANAGER])
  }

  """
  Enhanced security settings for user authentication and access control
  """
  type UserSecuritySettings {
    passwordLastChanged: DateTime!
    mfaMethod: String
    loginAttempts: Int! @auth(requires: [ADMIN])
    lockoutUntil: DateTime @auth(requires: [ADMIN])
    securityQuestions: [SecurityQuestion!]! @auth(requires: [ADMIN, SELF])
  }

  """
  Security question type for enhanced account recovery
  """
  type SecurityQuestion {
    question: String!
    lastUpdated: DateTime!
  }

  """
  Comprehensive user preferences with accessibility support
  """
  type UserPreferences {
    theme: String!
    language: String!
    notifications: NotificationPreferences!
    timezone: String!
    dateFormat: String!
    accessibility: AccessibilitySettings!
  }

  """
  Granular notification preferences
  """
  type NotificationPreferences {
    email: Boolean!
    push: Boolean!
    inApp: Boolean!
    digest: Boolean!
  }

  """
  WCAG 2.1 compliant accessibility settings
  """
  type AccessibilitySettings {
    screenReader: Boolean!
    reduceMotion: Boolean!
    highContrast: Boolean!
    fontSize: Int!
    colorBlindMode: String
  }

  """
  Role-based access control enumeration
  """
  enum UserRole {
    ADMIN
    MANAGER
    MEMBER
    GUEST
  }

  """
  Audit log entry for security compliance
  """
  type AuditEntry @auth(requires: [ADMIN]) {
    id: ID!
    userId: ID!
    action: String!
    timestamp: DateTime!
    ipAddress: String!
    userAgent: String!
    details: String
  }

  """
  User-related queries with security constraints
  """
  type Query {
    """
    Retrieve users with optional filtering
    """
    users(
      filter: UserFilterInput
      pagination: PaginationInput
    ): UserConnection! @auth(requires: [ADMIN, MANAGER])

    """
    Get specific user by ID
    """
    user(id: ID!): User @auth(requires: [ADMIN, MANAGER, SELF])

    """
    Get currently authenticated user
    """
    currentUser: User! @auth(requires: [ADMIN, MANAGER, MEMBER, GUEST])

    """
    Retrieve user audit log
    """
    userAuditLog(
      userId: ID!
      dateRange: DateRangeInput
    ): [AuditEntry!]! @auth(requires: [ADMIN])

    """
    Retrieve user security status
    """
    userSecurityStatus(
      userId: ID!
    ): UserSecurityStatus! @auth(requires: [ADMIN, SELF])
  }

  """
  User-related mutations with security and audit features
  """
  type Mutation {
    """
    Update user profile with audit logging
    """
    updateUser(
      id: ID!
      input: UpdateUserInput!
    ): User! @auth(requires: [ADMIN, SELF])

    """
    Update user preferences
    """
    updateUserPreferences(
      input: UpdateUserPreferencesInput!
    ): UserPreferences! @auth(requires: [ADMIN, MANAGER, MEMBER, SELF])

    """
    Update security settings
    """
    updateSecuritySettings(
      input: UpdateSecuritySettingsInput!
    ): UserSecuritySettings! @auth(requires: [ADMIN, SELF])

    """
    Enable Multi-Factor Authentication
    """
    enableMFA(
      method: MFAMethod!
    ): MFAEnableResponse! @auth(requires: [ADMIN, MANAGER, MEMBER, SELF])

    """
    Disable Multi-Factor Authentication
    """
    disableMFA(
      verificationCode: String!
    ): Boolean! @auth(requires: [ADMIN, SELF])

    """
    Deactivate user account
    """
    deactivateUser(
      id: ID!
      reason: String!
    ): Boolean! @auth(requires: [ADMIN])

    """
    Reactivate user account
    """
    activateUser(
      id: ID!
    ): Boolean! @auth(requires: [ADMIN])

    """
    Reset user password with security verification
    """
    resetPassword(
      token: String!
      newPassword: String!
      mfaCode: String
    ): ResetPasswordResponse!
  }

  """
  Input for updating user profile
  """
  input UpdateUserInput {
    firstName: String
    lastName: String
    role: UserRole @auth(requires: [ADMIN])
    teams: [String!] @auth(requires: [ADMIN, MANAGER])
  }

  """
  Input for updating user preferences
  """
  input UpdateUserPreferencesInput {
    theme: String
    language: String
    notifications: NotificationPreferencesInput
    timezone: String
    dateFormat: String
    accessibility: AccessibilitySettingsInput
  }

  """
  Input for notification preferences
  """
  input NotificationPreferencesInput {
    email: Boolean
    push: Boolean
    inApp: Boolean
    digest: Boolean
  }

  """
  Input for accessibility settings
  """
  input AccessibilitySettingsInput {
    screenReader: Boolean
    reduceMotion: Boolean
    highContrast: Boolean
    fontSize: Int
    colorBlindMode: String
  }

  """
  Input for security settings updates
  """
  input UpdateSecuritySettingsInput {
    mfaMethod: MFAMethod
    securityQuestions: [SecurityQuestionInput!]
  }

  """
  Input for security questions
  """
  input SecurityQuestionInput {
    question: String!
    answer: String!
  }

  """
  Input for user filtering
  """
  input UserFilterInput {
    roles: [UserRole!]
    isActive: Boolean
    mfaEnabled: Boolean
    teams: [String!]
    organizationId: String
  }

  """
  Input for pagination
  """
  input PaginationInput {
    page: Int!
    limit: Int!
  }

  """
  Input for date range filtering
  """
  input DateRangeInput {
    startDate: DateTime!
    endDate: DateTime!
  }

  """
  Supported MFA methods
  """
  enum MFAMethod {
    TOTP
    SMS
    EMAIL
  }

  """
  Response type for MFA enablement
  """
  type MFAEnableResponse {
    success: Boolean!
    secretKey: String
    qrCode: String
  }

  """
  Response type for password reset
  """
  type ResetPasswordResponse {
    success: Boolean!
    requiresMFA: Boolean!
  }

  """
  Connection type for paginated user results
  """
  type UserConnection {
    edges: [UserEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  """
  Edge type for user pagination
  """
  type UserEdge {
    node: User!
    cursor: String!
  }

  """
  Page information for pagination
  """
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  """
  User security status type
  """
  type UserSecurityStatus {
    passwordStrength: Int!
    daysSinceLastPasswordChange: Int!
    mfaEnabled: Boolean!
    lastSecurityAudit: DateTime
    securityScore: Int!
  }
`;
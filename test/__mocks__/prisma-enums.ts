// Mock re-export of generated/prisma/enums for Jest (avoids ESM transform issues)

export const GlobalRole = {
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;
export type GlobalRole = (typeof GlobalRole)[keyof typeof GlobalRole];

export const ProjectRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
  VIEWER: 'VIEWER',
} as const;
export type ProjectRole = (typeof ProjectRole)[keyof typeof ProjectRole];

export const IssueStatus = {
  BACKLOG: 'BACKLOG',
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW: 'IN_REVIEW',
  DONE: 'DONE',
  CANCELLED: 'CANCELLED',
} as const;
export type IssueStatus = (typeof IssueStatus)[keyof typeof IssueStatus];

export const Priority = {
  LOWEST: 'LOWEST',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  HIGHEST: 'HIGHEST',
} as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

export const IssueType = {
  EPIC: 'EPIC',
  STORY: 'STORY',
  TASK: 'TASK',
  BUG: 'BUG',
  SUBTASK: 'SUBTASK',
} as const;
export type IssueType = (typeof IssueType)[keyof typeof IssueType];

export const SprintStatus = {
  PLANNING: 'PLANNING',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
} as const;
export type SprintStatus = (typeof SprintStatus)[keyof typeof SprintStatus];

export const NotificationType = {
  ISSUE_ASSIGNED: 'ISSUE_ASSIGNED',
  ISSUE_STATUS_CHANGED: 'ISSUE_STATUS_CHANGED',
  COMMENT_ADDED: 'COMMENT_ADDED',
  MENTIONED: 'MENTIONED',
  SPRINT_STARTED: 'SPRINT_STARTED',
  SPRINT_COMPLETED: 'SPRINT_COMPLETED',
  MEMBER_INVITED: 'MEMBER_INVITED',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

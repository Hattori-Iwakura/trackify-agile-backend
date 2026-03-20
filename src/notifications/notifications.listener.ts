import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './gateway/notifications.gateway';

export interface IssueAssignedEvent {
  projectId: string;
  issueKey: string;
  assigneeId: string;
  assignedBy: string;
}

export interface IssueStatusChangedEvent {
  projectId: string;
  issueKey: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
}

export interface CommentAddedEvent {
  projectId: string;
  issueKey: string;
  commentId: string;
  authorId: string;
  content: string;
  issueReporterId: string;
}

export interface MemberInvitedEvent {
  projectId: string;
  userId: string;
  invitedBy: string;
  role: string;
}

export interface SprintEvent {
  projectId: string;
  sprintId: string;
  sprintName: string;
  memberIds: string[];
}

export interface UserMentionedEvent {
  projectId: string;
  issueKey: string;
  mentionedUserId: string;
  mentionedBy: string;
}

@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly gateway: NotificationsGateway,
  ) {}

  @OnEvent('issue.assigned')
  async handleIssueAssigned(event: IssueAssignedEvent) {
    try {
      this.logger.log(`issue.assigned: ${event.issueKey} → ${event.assigneeId}`);
      const notification = await this.notificationsService.create({
        type: 'ISSUE_ASSIGNED',
        title: 'Issue Assigned',
        message: `You were assigned ${event.issueKey}`,
        userId: event.assigneeId,
        data: event,
      });
      this.gateway.emitNotification(event.assigneeId, notification);
    } catch (error) {
      this.logger.error(`Failed to handle issue.assigned: ${event.issueKey}`, error);
    }
  }

  @OnEvent('issue.status.changed')
  async handleIssueStatusChanged(event: IssueStatusChangedEvent) {
    try {
      this.logger.log(`issue.status.changed: ${event.issueKey} ${event.oldStatus} → ${event.newStatus}`);
      this.gateway.emitBoardUpdate(event.projectId, {
        issueKey: event.issueKey,
        oldStatus: event.oldStatus,
        newStatus: event.newStatus,
      });
    } catch (error) {
      this.logger.error(`Failed to handle issue.status.changed: ${event.issueKey}`, error);
    }
  }

  @OnEvent('comment.added')
  async handleCommentAdded(event: CommentAddedEvent) {
    try {
      this.logger.log(`comment.added: ${event.issueKey} by ${event.authorId}`);
      this.gateway.emitNewComment(event.issueKey, {
        id: event.commentId,
        content: event.content,
        authorId: event.authorId,
      });

      if (event.issueReporterId !== event.authorId) {
        const notification = await this.notificationsService.create({
          type: 'COMMENT_ADDED',
          title: 'New Comment',
          message: `New comment on ${event.issueKey}`,
          userId: event.issueReporterId,
          data: event,
        });
        this.gateway.emitNotification(event.issueReporterId, notification);
      }
    } catch (error) {
      this.logger.error(`Failed to handle comment.added: ${event.issueKey}`, error);
    }
  }

  @OnEvent('member.invited')
  async handleMemberInvited(event: MemberInvitedEvent) {
    try {
      this.logger.log(`member.invited: ${event.userId} to project ${event.projectId}`);
      const notification = await this.notificationsService.create({
        type: 'MEMBER_INVITED',
        title: 'Project Invitation',
        message: `You were invited to a project`,
        userId: event.userId,
        data: event,
      });
      this.gateway.emitNotification(event.userId, notification);
    } catch (error) {
      this.logger.error(`Failed to handle member.invited: ${event.userId}`, error);
    }
  }

  @OnEvent('sprint.started')
  async handleSprintStarted(event: SprintEvent) {
    this.logger.log(`sprint.started: ${event.sprintName}`);
    for (const memberId of event.memberIds) {
      try {
        const notification = await this.notificationsService.create({
          type: 'SPRINT_STARTED',
          title: 'Sprint Started',
          message: `Sprint "${event.sprintName}" has started`,
          userId: memberId,
          data: event,
        });
        this.gateway.emitNotification(memberId, notification);
      } catch (error) {
        this.logger.error(`Failed to notify ${memberId} for sprint.started: ${event.sprintName}`, error);
      }
    }
  }

  @OnEvent('sprint.completed')
  async handleSprintCompleted(event: SprintEvent) {
    this.logger.log(`sprint.completed: ${event.sprintName}`);
    for (const memberId of event.memberIds) {
      try {
        const notification = await this.notificationsService.create({
          type: 'SPRINT_COMPLETED',
          title: 'Sprint Completed',
          message: `Sprint "${event.sprintName}" has been completed`,
          userId: memberId,
          data: event,
        });
        this.gateway.emitNotification(memberId, notification);
      } catch (error) {
        this.logger.error(`Failed to notify ${memberId} for sprint.completed: ${event.sprintName}`, error);
      }
    }
  }

  @OnEvent('user.mentioned')
  async handleUserMentioned(event: UserMentionedEvent) {
    try {
      this.logger.log(`user.mentioned: ${event.mentionedUserId} in ${event.issueKey}`);
      const notification = await this.notificationsService.create({
        type: 'MENTIONED',
        title: 'You Were Mentioned',
        message: `You were mentioned in ${event.issueKey}`,
        userId: event.mentionedUserId,
        data: event,
      });
      this.gateway.emitNotification(event.mentionedUserId, notification);
    } catch (error) {
      this.logger.error(`Failed to handle user.mentioned: ${event.mentionedUserId}`, error);
    }
  }
}

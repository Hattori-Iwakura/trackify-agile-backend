import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class NotificationsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      const payload = await this.jwtService.verifyAsync(token);
      client.data = { userId: payload.sub };
      client.join(`user:${payload.sub}`);
      this.logger.log(`Client connected: ${client.id} (user:${payload.sub})`);
    } catch {
      this.logger.warn(`Client rejected: ${client.id} — invalid JWT`);
      client.disconnect();
    }
  }

  @SubscribeMessage('joinProject')
  handleJoinProject(client: Socket, data: { projectId: string }) {
    client.join(`project:${data.projectId}`);
  }

  @SubscribeMessage('leaveProject')
  handleLeaveProject(client: Socket, data: { projectId: string }) {
    client.leave(`project:${data.projectId}`);
  }

  @SubscribeMessage('joinIssue')
  handleJoinIssue(client: Socket, data: { issueKey: string }) {
    client.join(`issue:${data.issueKey}`);
  }

  emitBoardUpdate(projectId: string, payload: any) {
    this.server.to(`project:${projectId}`).emit('board:update', payload);
  }

  emitNewComment(issueKey: string, payload: any) {
    this.server.to(`issue:${issueKey}`).emit('comment:new', payload);
  }

  emitNotification(userId: string, payload: any) {
    this.server.to(`user:${userId}`).emit('notification:new', payload);
  }

  emitCommentUpdated(issueKey: string, payload: any) {
    this.server.to(`issue:${issueKey}`).emit('comment:updated', payload);
  }

  emitCommentDeleted(issueKey: string, payload: any) {
    this.server.to(`issue:${issueKey}`).emit('comment:deleted', payload);
  }
}

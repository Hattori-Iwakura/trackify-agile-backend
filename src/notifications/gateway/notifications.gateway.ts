import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Per-client rate limiter for WebSocket events.
 * Tracks event timestamps per client and rejects bursts.
 */
interface RateLimitEntry {
  timestamps: number[];
}

const WS_RATE_LIMIT = { maxEvents: 20, windowMs: 10_000 }; // 20 events per 10s
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim()),
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly rateLimitMap = new Map<string, RateLimitEntry>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client rejected: ${client.id} — no token provided`);
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token);
      client.data = { userId: payload.sub };
      client.join(`user:${payload.sub}`);
      this.logger.log(`Client connected: ${client.id} (user:${payload.sub})`);
    } catch {
      this.logger.warn(`Client rejected: ${client.id} — invalid JWT`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId || 'unknown';
    this.rateLimitMap.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id} (user:${userId})`);
  }

  @SubscribeMessage('joinProject')
  async handleJoinProject(client: Socket, data: { projectId: string }) {
    if (!this.checkRateLimit(client)) return;

    const userId = client.data?.userId;
    if (!userId || !data?.projectId || !UUID_REGEX.test(data.projectId)) {
      client.emit('error', { message: 'Invalid request' });
      return;
    }

    const membership = await this.prisma.projectMember.findUnique({
      where: { userId_projectId: { userId, projectId: data.projectId } },
    });

    if (!membership) {
      client.emit('error', {
        message: 'You are not a member of this project',
        errorCode: 'WS_UNAUTHORIZED_ROOM',
      });
      return;
    }

    client.join(`project:${data.projectId}`);
  }

  @SubscribeMessage('leaveProject')
  handleLeaveProject(client: Socket, data: { projectId: string }) {
    if (!this.checkRateLimit(client)) return;
    if (!data?.projectId || !UUID_REGEX.test(data.projectId)) {
      client.emit('error', { message: 'Invalid request' });
      return;
    }
    client.leave(`project:${data.projectId}`);
  }

  @SubscribeMessage('joinIssue')
  async handleJoinIssue(client: Socket, data: { issueKey: string }) {
    if (!this.checkRateLimit(client)) return;

    const userId = client.data?.userId;
    if (!userId || !data?.issueKey) {
      client.emit('error', { message: 'Invalid request' });
      return;
    }

    // Find the issue and verify user is a member of its project
    const issue = await this.prisma.issue.findFirst({
      where: { issueKey: data.issueKey },
      select: { projectId: true },
    });

    if (!issue) {
      client.emit('error', { message: 'Issue not found' });
      return;
    }

    const membership = await this.prisma.projectMember.findUnique({
      where: {
        userId_projectId: { userId, projectId: issue.projectId },
      },
    });

    if (!membership) {
      client.emit('error', {
        message: 'You are not a member of this project',
        errorCode: 'WS_UNAUTHORIZED_ROOM',
      });
      return;
    }

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

  /**
   * Sliding-window rate limiter per client socket.
   * Returns true if within limit, false if exceeded (also emits error + disconnects).
   */
  private checkRateLimit(client: Socket): boolean {
    const now = Date.now();
    const clientId = client.id;

    let entry = this.rateLimitMap.get(clientId);
    if (!entry) {
      entry = { timestamps: [] };
      this.rateLimitMap.set(clientId, entry);
    }

    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter(
      (t) => now - t < WS_RATE_LIMIT.windowMs,
    );

    if (entry.timestamps.length >= WS_RATE_LIMIT.maxEvents) {
      this.logger.warn(
        `Rate limit exceeded for client ${clientId} (user:${client.data?.userId})`,
      );
      client.emit('error', {
        message: 'Rate limit exceeded. Too many events.',
        errorCode: 'WS_RATE_LIMIT_EXCEEDED',
      });
      client.disconnect();
      return false;
    }

    entry.timestamps.push(now);
    return true;
  }
}

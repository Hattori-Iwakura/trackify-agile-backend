import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsGateway } from './notifications.gateway';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;
  let jwtService: Record<string, jest.Mock>;
  let prisma: Record<string, any>;

  const createMockClient = (overrides: any = {}) => ({
    handshake: {
      auth: { token: 'valid-token' },
      headers: {},
    },
    join: jest.fn(),
    leave: jest.fn(),
    disconnect: jest.fn(),
    emit: jest.fn(),
    id: 'socket-1',
    data: { userId: 'uuid-1' },
    ...overrides,
  });

  beforeEach(async () => {
    jwtService = {
      verifyAsync: jest.fn(),
    };

    prisma = {
      projectMember: {
        findUnique: jest.fn(),
      },
      issue: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsGateway,
        { provide: JwtService, useValue: jwtService },
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:3000') },
        },
      ],
    }).compile();

    gateway = module.get<NotificationsGateway>(NotificationsGateway);
  });

  // =============================================
  // handleConnection
  // =============================================
  describe('handleConnection', () => {
    it('should authenticate client via JWT and auto-join user room', async () => {
      const client = createMockClient();
      jwtService.verifyAsync.mockResolvedValue({ sub: 'uuid-1' });

      await gateway.handleConnection(client as any);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token');
      expect(client.join).toHaveBeenCalledWith('user:uuid-1');
    });

    it('should disconnect client on invalid JWT', async () => {
      const client = createMockClient();
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await gateway.handleConnection(client as any);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should disconnect client when no token is provided', async () => {
      const client = createMockClient({
        handshake: { auth: {}, headers: {} },
      });

      await gateway.handleConnection(client as any);

      expect(client.disconnect).toHaveBeenCalled();
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('should accept token from authorization header', async () => {
      const client = createMockClient({
        handshake: {
          auth: {},
          headers: { authorization: 'Bearer header-token' },
        },
      });
      jwtService.verifyAsync.mockResolvedValue({ sub: 'uuid-2' });

      await gateway.handleConnection(client as any);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('header-token');
      expect(client.join).toHaveBeenCalledWith('user:uuid-2');
    });
  });

  // =============================================
  // handleDisconnect
  // =============================================
  describe('handleDisconnect', () => {
    it('should log disconnection with userId', () => {
      const client = createMockClient();
      // Should not throw
      gateway.handleDisconnect(client as any);
    });

    it('should handle disconnect when userId is missing', () => {
      const client = createMockClient({ data: {} });
      // Should not throw
      gateway.handleDisconnect(client as any);
    });
  });

  // =============================================
  // handleJoinProject — authorization
  // =============================================
  describe('handleJoinProject', () => {
    it('should join project room when user is a member', async () => {
      const client = createMockClient();
      prisma.projectMember.findUnique.mockResolvedValue({
        userId: 'uuid-1',
        projectId: '00000000-0000-4000-a000-000000000010',
        role: 'MEMBER',
      });

      await gateway.handleJoinProject(client as any, { projectId: '00000000-0000-4000-a000-000000000010' });

      expect(prisma.projectMember.findUnique).toHaveBeenCalledWith({
        where: {
          userId_projectId: { userId: 'uuid-1', projectId: '00000000-0000-4000-a000-000000000010' },
        },
      });
      expect(client.join).toHaveBeenCalledWith('project:00000000-0000-4000-a000-000000000010');
    });

    it('should reject join when user is not a project member', async () => {
      const client = createMockClient();
      prisma.projectMember.findUnique.mockResolvedValue(null);

      await gateway.handleJoinProject(client as any, { projectId: '00000000-0000-4000-a000-000000000010' });

      expect(client.join).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith('error', {
        message: 'You are not a member of this project',
        errorCode: 'WS_UNAUTHORIZED_ROOM',
      });
    });

    it('should emit error when userId is missing', async () => {
      const client = createMockClient({ data: {} });

      await gateway.handleJoinProject(client as any, { projectId: '00000000-0000-4000-a000-000000000010' });

      expect(client.join).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith('error', {
        message: 'Invalid request',
      });
    });
  });

  // =============================================
  // handleLeaveProject
  // =============================================
  describe('handleLeaveProject', () => {
    it('should remove client from project room', () => {
      const client = createMockClient();

      gateway.handleLeaveProject(client as any, { projectId: '00000000-0000-4000-a000-000000000010' });

      expect(client.leave).toHaveBeenCalledWith('project:00000000-0000-4000-a000-000000000010');
    });
  });

  // =============================================
  // handleJoinIssue — authorization
  // =============================================
  describe('handleJoinIssue', () => {
    it('should join issue room when user is a project member', async () => {
      const client = createMockClient();
      prisma.issue.findFirst.mockResolvedValue({ projectId: '00000000-0000-4000-a000-000000000010' });
      prisma.projectMember.findUnique.mockResolvedValue({
        userId: 'uuid-1',
        projectId: '00000000-0000-4000-a000-000000000010',
        role: 'MEMBER',
      });

      await gateway.handleJoinIssue(client as any, { issueKey: 'TRK-1' });

      expect(prisma.issue.findFirst).toHaveBeenCalledWith({
        where: { issueKey: 'TRK-1' },
        select: { projectId: true },
      });
      expect(client.join).toHaveBeenCalledWith('issue:TRK-1');
    });

    it('should reject join when issue is not found', async () => {
      const client = createMockClient();
      prisma.issue.findFirst.mockResolvedValue(null);

      await gateway.handleJoinIssue(client as any, { issueKey: 'FAKE-1' });

      expect(client.join).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith('error', {
        message: 'Issue not found',
      });
    });

    it('should reject join when user is not a member of the issue project', async () => {
      const client = createMockClient();
      prisma.issue.findFirst.mockResolvedValue({ projectId: '00000000-0000-4000-a000-000000000010' });
      prisma.projectMember.findUnique.mockResolvedValue(null);

      await gateway.handleJoinIssue(client as any, { issueKey: 'TRK-1' });

      expect(client.join).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith('error', {
        message: 'You are not a member of this project',
        errorCode: 'WS_UNAUTHORIZED_ROOM',
      });
    });

    it('should emit error when userId is missing', async () => {
      const client = createMockClient({ data: {} });

      await gateway.handleJoinIssue(client as any, { issueKey: 'TRK-1' });

      expect(client.join).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith('error', {
        message: 'Invalid request',
      });
    });
  });

  // =============================================
  // Rate limiting
  // =============================================
  describe('rate limiting', () => {
    it('should disconnect client after exceeding rate limit', async () => {
      const client = createMockClient();
      prisma.projectMember.findUnique.mockResolvedValue({
        userId: 'uuid-1',
        projectId: '00000000-0000-4000-a000-000000000010',
        role: 'MEMBER',
      });

      // Fire 20 events (limit) — all should pass
      for (let i = 0; i < 20; i++) {
        await gateway.handleJoinProject(client as any, {
          projectId: '00000000-0000-4000-a000-000000000010',
        });
      }
      expect(client.disconnect).not.toHaveBeenCalled();

      // 21st event should trigger rate limit and disconnect
      await gateway.handleJoinProject(client as any, { projectId: '00000000-0000-4000-a000-000000000010' });

      expect(client.emit).toHaveBeenCalledWith('error', {
        message: 'Rate limit exceeded. Too many events.',
        errorCode: 'WS_RATE_LIMIT_EXCEEDED',
      });
      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should apply rate limit across different event types', async () => {
      const client = createMockClient();
      prisma.projectMember.findUnique.mockResolvedValue({
        userId: 'uuid-1',
        projectId: '00000000-0000-4000-a000-000000000010',
        role: 'MEMBER',
      });
      prisma.issue.findFirst.mockResolvedValue({ projectId: '00000000-0000-4000-a000-000000000010' });

      // Mix of joinProject and joinIssue events (20 total = limit)
      for (let i = 0; i < 10; i++) {
        await gateway.handleJoinProject(client as any, {
          projectId: '00000000-0000-4000-a000-000000000010',
        });
      }
      for (let i = 0; i < 10; i++) {
        await gateway.handleJoinIssue(client as any, { issueKey: 'TRK-1' });
      }

      expect(client.disconnect).not.toHaveBeenCalled();

      // 21st event (leaveProject) should exceed the limit
      gateway.handleLeaveProject(client as any, { projectId: '00000000-0000-4000-a000-000000000010' });

      expect(client.disconnect).toHaveBeenCalled();
    });
  });

  // =============================================
  // Emit methods
  // =============================================
  describe('emitBoardUpdate', () => {
    it('should emit board:update to project room', () => {
      const mockServer = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      };
      (gateway as any).server = mockServer;

      gateway.emitBoardUpdate('00000000-0000-4000-a000-000000000010', { issueKey: 'TRK-1', status: 'DONE' });

      expect(mockServer.to).toHaveBeenCalledWith('project:00000000-0000-4000-a000-000000000010');
      expect(mockServer.emit).toHaveBeenCalledWith('board:update', {
        issueKey: 'TRK-1',
        status: 'DONE',
      });
    });
  });

  describe('emitNewComment', () => {
    it('should emit comment:new to issue room', () => {
      const mockServer = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      };
      (gateway as any).server = mockServer;

      gateway.emitNewComment('TRK-1', { id: 'comment-1', content: 'Hello' });

      expect(mockServer.to).toHaveBeenCalledWith('issue:TRK-1');
      expect(mockServer.emit).toHaveBeenCalledWith('comment:new', {
        id: 'comment-1',
        content: 'Hello',
      });
    });
  });

  describe('emitNotification', () => {
    it('should emit notification:new to user room', () => {
      const mockServer = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      };
      (gateway as any).server = mockServer;

      gateway.emitNotification('uuid-1', {
        id: 'notif-1',
        type: 'ISSUE_ASSIGNED',
        message: 'You were assigned TRK-1',
      });

      expect(mockServer.to).toHaveBeenCalledWith('user:uuid-1');
      expect(mockServer.emit).toHaveBeenCalledWith('notification:new', {
        id: 'notif-1',
        type: 'ISSUE_ASSIGNED',
        message: 'You were assigned TRK-1',
      });
    });
  });
});

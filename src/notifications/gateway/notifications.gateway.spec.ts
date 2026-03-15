import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsGateway } from './notifications.gateway';
import { JwtService } from '@nestjs/jwt';

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;
  let jwtService: Record<string, jest.Mock>;

  beforeEach(async () => {
    jwtService = {
      verifyAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsGateway,
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    gateway = module.get<NotificationsGateway>(NotificationsGateway);
  });

  describe('handleConnection', () => {
    it('should authenticate client via JWT and auto-join user room', async () => {
      const mockClient = {
        handshake: {
          auth: { token: 'valid-token' },
          headers: {},
        },
        join: jest.fn(),
        disconnect: jest.fn(),
        id: 'socket-1',
      };

      jwtService.verifyAsync.mockResolvedValue({ sub: 'uuid-1' });

      await gateway.handleConnection(mockClient as any);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token');
      expect(mockClient.join).toHaveBeenCalledWith('user:uuid-1');
    });

    it('should disconnect client on invalid JWT', async () => {
      const mockClient = {
        handshake: {
          auth: { token: 'invalid' },
          headers: {},
        },
        join: jest.fn(),
        disconnect: jest.fn(),
        id: 'socket-1',
      };

      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await gateway.handleConnection(mockClient as any);

      expect(mockClient.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleJoinProject', () => {
    it('should join client to project room', () => {
      const mockClient = {
        join: jest.fn(),
        data: { userId: 'uuid-1' },
      };

      gateway.handleJoinProject(mockClient as any, { projectId: 'proj-1' });

      expect(mockClient.join).toHaveBeenCalledWith('project:proj-1');
    });
  });

  describe('handleLeaveProject', () => {
    it('should remove client from project room', () => {
      const mockClient = {
        leave: jest.fn(),
        data: { userId: 'uuid-1' },
      };

      gateway.handleLeaveProject(mockClient as any, { projectId: 'proj-1' });

      expect(mockClient.leave).toHaveBeenCalledWith('project:proj-1');
    });
  });

  describe('handleJoinIssue', () => {
    it('should join client to issue room', () => {
      const mockClient = {
        join: jest.fn(),
        data: { userId: 'uuid-1' },
      };

      gateway.handleJoinIssue(mockClient as any, { issueKey: 'TRK-1' });

      expect(mockClient.join).toHaveBeenCalledWith('issue:TRK-1');
    });
  });

  describe('emitBoardUpdate', () => {
    it('should emit board:update to project room', () => {
      const mockServer = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      };
      (gateway as any).server = mockServer;

      gateway.emitBoardUpdate('proj-1', { issueKey: 'TRK-1', status: 'DONE' });

      expect(mockServer.to).toHaveBeenCalledWith('project:proj-1');
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

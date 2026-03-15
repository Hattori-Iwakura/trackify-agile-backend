import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProjectRoleGuard } from './project-role.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { createMockPrismaService } from '../../../test/helpers/mock-prisma.helper';

describe('ProjectRoleGuard', () => {
  let guard: ProjectRoleGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let prisma: ReturnType<typeof createMockPrismaService>;

  function createMockContext(
    userId: string,
    projectId: string,
  ): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: userId },
          params: { projectId },
        }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    prisma = createMockPrismaService();
    reflector = { getAllAndOverride: jest.fn() };

    guard = new ProjectRoleGuard(
      reflector as unknown as Reflector,
      prisma as unknown as PrismaService,
    );
  });

  it('should allow access when user has required role', async () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN', 'OWNER']);
    prisma.projectMember.findUnique.mockResolvedValue({
      userId: 'uuid-1',
      projectId: 'proj-1',
      role: 'ADMIN',
    });

    const context = createMockContext('uuid-1', 'proj-1');
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should deny access when user lacks required role', async () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN', 'OWNER']);
    prisma.projectMember.findUnique.mockResolvedValue({
      userId: 'uuid-1',
      projectId: 'proj-1',
      role: 'VIEWER',
    });

    const context = createMockContext('uuid-1', 'proj-1');
    const result = await guard.canActivate(context);

    expect(result).toBe(false);
  });

  it('should deny access when user is not a project member', async () => {
    reflector.getAllAndOverride.mockReturnValue(['MEMBER']);
    prisma.projectMember.findUnique.mockResolvedValue(null);

    const context = createMockContext('uuid-1', 'proj-1');
    const result = await guard.canActivate(context);

    expect(result).toBe(false);
  });

  it('should allow access when no roles are specified', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const context = createMockContext('uuid-1', 'proj-1');
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should handle multiple allowed roles', async () => {
    reflector.getAllAndOverride.mockReturnValue(['MEMBER', 'ADMIN', 'OWNER']);
    prisma.projectMember.findUnique.mockResolvedValue({
      userId: 'uuid-1',
      role: 'MEMBER',
    });

    const context = createMockContext('uuid-1', 'proj-1');
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });
});

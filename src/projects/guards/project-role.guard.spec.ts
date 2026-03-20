import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProjectRoleGuard } from './project-role.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { createMockPrismaService } from '../../../test/helpers/mock-prisma.helper';
import { PROJECT_ROLES_KEY } from '../decorators/require-project-roles.decorator';
import { ProjectRole } from '../../../generated/prisma/enums';

describe('ProjectRoleGuard', () => {
  let guard: ProjectRoleGuard;
  let reflector: Reflector;
  let prisma: ReturnType<typeof createMockPrismaService>;

  const mockExecutionContext = (params: Record<string, string> = {}, user: any = { id: 'user-1' }): ExecutionContext => {
    const req = { params, user, projectMember: undefined };
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectRoleGuard,
        Reflector,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    guard = module.get<ProjectRoleGuard>(ProjectRoleGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should deny access when user is not a project member', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    prisma.projectMember.findUnique.mockResolvedValue(null);

    const ctx = mockExecutionContext({ projectId: 'proj-1' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should allow access for any member when no roles are required', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    prisma.projectMember.findUnique.mockResolvedValue({
      id: 'pm-1',
      userId: 'user-1',
      projectId: 'proj-1',
      role: ProjectRole.VIEWER,
    });

    const ctx = mockExecutionContext({ projectId: 'proj-1' });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('should allow access when member has a required role', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([ProjectRole.ADMIN, ProjectRole.OWNER]);
    prisma.projectMember.findUnique.mockResolvedValue({
      id: 'pm-1',
      userId: 'user-1',
      projectId: 'proj-1',
      role: ProjectRole.ADMIN,
    });

    const ctx = mockExecutionContext({ projectId: 'proj-1' });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('should deny access when member lacks required role', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([ProjectRole.OWNER]);
    prisma.projectMember.findUnique.mockResolvedValue({
      id: 'pm-1',
      userId: 'user-1',
      projectId: 'proj-1',
      role: ProjectRole.MEMBER,
    });

    const ctx = mockExecutionContext({ projectId: 'proj-1' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should include required roles in error message', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([ProjectRole.ADMIN, ProjectRole.OWNER]);
    prisma.projectMember.findUnique.mockResolvedValue({
      id: 'pm-1',
      userId: 'user-1',
      projectId: 'proj-1',
      role: ProjectRole.VIEWER,
    });

    const ctx = mockExecutionContext({ projectId: 'proj-1' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(
      /Insufficient project role\. Required: ADMIN, OWNER/,
    );
  });

  it('should attach projectMember to the request', async () => {
    const membership = {
      id: 'pm-1',
      userId: 'user-1',
      projectId: 'proj-1',
      role: ProjectRole.OWNER,
    };
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    prisma.projectMember.findUnique.mockResolvedValue(membership);

    const ctx = mockExecutionContext({ projectId: 'proj-1' });
    await guard.canActivate(ctx);

    const req = ctx.switchToHttp().getRequest();
    expect(req.projectMember).toEqual(membership);
  });

  it('should deny access when projectId is missing from params', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const ctx = mockExecutionContext({});

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should deny access when user is missing from request', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const ctx = mockExecutionContext({ projectId: 'proj-1' }, undefined);

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should use userId_projectId compound unique for lookup', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    prisma.projectMember.findUnique.mockResolvedValue({
      id: 'pm-1',
      userId: 'user-1',
      projectId: 'proj-1',
      role: ProjectRole.MEMBER,
    });

    const ctx = mockExecutionContext({ projectId: 'proj-1' });
    await guard.canActivate(ctx);

    expect(prisma.projectMember.findUnique).toHaveBeenCalledWith({
      where: { userId_projectId: { userId: 'user-1', projectId: 'proj-1' } },
    });
  });
});

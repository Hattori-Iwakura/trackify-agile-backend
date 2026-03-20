import { Test, TestingModule } from '@nestjs/testing';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { ProjectRoleGuard } from './guards/project-role.guard';
import { ProjectRole } from '../../generated/prisma/enums';

describe('MembersController', () => {
  let controller: MembersController;
  let service: {
    addMember: jest.Mock;
    findAll: jest.Mock;
    updateRole: jest.Mock;
    removeMember: jest.Mock;
    leave: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      addMember: jest.fn(),
      findAll: jest.fn(),
      updateRole: jest.fn(),
      removeMember: jest.fn(),
      leave: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MembersController],
      providers: [{ provide: MembersService, useValue: service }],
    })
      .overrideGuard(ProjectRoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MembersController>(MembersController);
  });

  describe('POST /projects/:projectId/members', () => {
    it('should add member and pass caller role', async () => {
      const dto = { userId: 'user-2', role: ProjectRole.MEMBER };
      const result = { id: 'pm-1', ...dto, projectId: 'proj-1' };
      service.addMember.mockResolvedValue(result);

      const req = { projectMember: { role: ProjectRole.OWNER } };
      const response = await controller.addMember('proj-1', dto, req);

      expect(service.addMember).toHaveBeenCalledWith('proj-1', dto, ProjectRole.OWNER);
      expect(response).toEqual(result);
    });
  });

  describe('GET /projects/:projectId/members', () => {
    it('should return paginated members', async () => {
      const result = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
      service.findAll.mockResolvedValue(result);

      const response = await controller.findAll('proj-1', { page: 1, limit: 20 });

      expect(service.findAll).toHaveBeenCalledWith('proj-1', { page: 1, limit: 20 });
      expect(response).toEqual(result);
    });
  });

  describe('PATCH /projects/:projectId/members/:userId', () => {
    it('should update member role', async () => {
      const dto = { role: ProjectRole.ADMIN };
      const result = { id: 'pm-1', role: ProjectRole.ADMIN };
      service.updateRole.mockResolvedValue(result);

      const req = { projectMember: { role: ProjectRole.OWNER } };
      const response = await controller.updateRole('proj-1', 'user-2', dto, req);

      expect(service.updateRole).toHaveBeenCalledWith('proj-1', 'user-2', dto, ProjectRole.OWNER);
      expect(response).toEqual(result);
    });
  });

  describe('DELETE /projects/:projectId/members/me', () => {
    it('should let current user leave', async () => {
      service.leave.mockResolvedValue({});

      const user = { id: 'user-1' };
      await controller.leave('proj-1', user);

      expect(service.leave).toHaveBeenCalledWith('proj-1', 'user-1');
    });
  });

  describe('DELETE /projects/:projectId/members/:userId', () => {
    it('should remove member and pass caller role', async () => {
      service.removeMember.mockResolvedValue({});

      const req = { projectMember: { role: ProjectRole.OWNER } };
      await controller.removeMember('proj-1', 'user-2', req);

      expect(service.removeMember).toHaveBeenCalledWith('proj-1', 'user-2', ProjectRole.OWNER);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      addMember: jest.fn(),
      removeMember: jest.fn(),
      updateMemberRole: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [{ provide: ProjectsService, useValue: service }],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
  });

  describe('POST /projects', () => {
    it('should create project and return result', async () => {
      const dto = { name: 'New', key: 'NEW' };
      service.create.mockResolvedValue({ id: 'proj-1', ...dto });

      const result = await controller.create({ id: 'uuid-1' }, dto);

      expect(service.create).toHaveBeenCalledWith(dto, 'uuid-1');
      expect(result).toHaveProperty('id');
    });
  });

  describe('GET /projects', () => {
    it('should return paginated list', async () => {
      service.findAll.mockResolvedValue({ data: [], meta: { total: 0 } });

      const result = await controller.findAll({ id: 'uuid-1' }, { page: 1, limit: 20 });

      expect(result).toHaveProperty('data');
    });
  });

  describe('GET /projects/:id', () => {
    it('should return single project', async () => {
      service.findOne.mockResolvedValue({ id: 'proj-1', name: 'Test' });

      const result = await controller.findOne('proj-1');

      expect(result).toHaveProperty('id', 'proj-1');
    });
  });

  describe('PATCH /projects/:id', () => {
    it('should update project', async () => {
      service.update.mockResolvedValue({ id: 'proj-1', name: 'Updated' });

      const result = await controller.update('proj-1', { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });
  });

  describe('DELETE /projects/:id', () => {
    it('should delete project', async () => {
      service.remove.mockResolvedValue(undefined);

      await expect(controller.remove('proj-1')).resolves.not.toThrow();
    });
  });

  describe('POST /projects/:id/members', () => {
    it('should add member', async () => {
      service.addMember.mockResolvedValue({ userId: 'uuid-2', role: 'MEMBER' });

      const result = await controller.addMember('proj-1', { userId: 'uuid-2', role: 'MEMBER' });

      expect(result.role).toBe('MEMBER');
    });
  });

  describe('DELETE /projects/:id/members/:userId', () => {
    it('should remove member', async () => {
      service.removeMember.mockResolvedValue(undefined);

      await expect(controller.removeMember('proj-1', 'uuid-2')).resolves.not.toThrow();
    });
  });

  describe('PATCH /projects/:id/members/:userId', () => {
    it('should update member role', async () => {
      service.updateMemberRole.mockResolvedValue({ role: 'ADMIN' });

      const result = await controller.updateMemberRole('proj-1', 'uuid-2', { role: 'ADMIN' });

      expect(result.role).toBe('ADMIN');
    });
  });
});
